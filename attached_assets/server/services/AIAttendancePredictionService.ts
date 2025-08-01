import OpenAI from "openai";
import { db } from '../db';
import { attendanceRecords, employeeRecords } from '../../shared/schema';
import { eq, gte, lte, and, desc, sql } from 'drizzle-orm';

// Note: Using gpt-4o as the newest OpenAI model released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface AttendancePattern {
  averageArrivalTime: string;
  attendanceRate: number;
  lateFrequency: number;
  consistencyScore: number;
  weeklyPatterns: { [key: string]: number };
  monthlyTrends: { [key: string]: number };
}

export interface PredictionResult {
  employeeCode: string;
  predictionDate: string;
  attendanceLikelihood: number;
  arrivalTimePrediction: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  suggestions: string[];
  patterns: AttendancePattern;
  factors: string[];
}

export class AIAttendancePredictionService {
  
  /**
   * Analyze historical attendance patterns for an employee
   */
  async analyzeEmployeePatterns(employeeCode: string, daysBack: number = 30): Promise<AttendancePattern> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);

    // Get attendance records for the employee
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeCode, employeeCode),
          gte(attendanceRecords.attendanceDate, startDate.toISOString().split('T')[0]),
          lte(attendanceRecords.attendanceDate, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(attendanceRecords.attendanceDate));

    // Calculate patterns
    const totalDays = daysBack;
    const presentDays = records.filter(r => r.checkInTime).length;
    const lateDays = records.filter(r => {
      if (!r.checkInTime) return false;
      const checkIn = new Date(`1970-01-01T${r.checkInTime}`);
      const lateThreshold = new Date(`1970-01-01T09:30:00`); // 9:30 AM threshold
      return checkIn > lateThreshold;
    }).length;

    // Calculate average arrival time
    const arrivalTimes = records
      .filter(r => r.checkInTime)
      .map(r => r.checkInTime as string);
    
    const averageArrivalTime = this.calculateAverageTime(arrivalTimes);

    // Weekly patterns (Monday = 0, Sunday = 6)
    const weeklyPatterns: { [key: string]: number } = {};
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    weekDays.forEach((day, index) => {
      const dayRecords = records.filter(r => {
        const date = new Date(r.attendanceDate);
        return date.getDay() === (index + 1) % 7; // Adjust for Monday start
      });
      weeklyPatterns[day] = dayRecords.length > 0 ? 
        (dayRecords.filter(r => r.checkInTime).length / dayRecords.length) * 100 : 0;
    });

    // Monthly trends (last 4 weeks)
    const monthlyTrends: { [key: string]: number } = {};
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(endDate.getDate() - (i * 7));
      const weekEnd = new Date();
      weekEnd.setDate(endDate.getDate() - ((i - 1) * 7));
      
      const weekRecords = records.filter(r => {
        const date = new Date(r.attendanceDate);
        return date >= weekEnd && date <= weekStart;
      });
      
      monthlyTrends[`Week ${4 - i}`] = weekRecords.length > 0 ? 
        (weekRecords.filter(r => r.checkInTime).length / weekRecords.length) * 100 : 0;
    }

    return {
      averageArrivalTime,
      attendanceRate: (presentDays / totalDays) * 100,
      lateFrequency: (lateDays / presentDays) * 100 || 0,
      consistencyScore: this.calculateConsistencyScore(records),
      weeklyPatterns,
      monthlyTrends
    };
  }

  /**
   * Generate AI-powered attendance prediction for an employee
   */
  async generatePrediction(employeeCode: string, targetDate: string): Promise<PredictionResult> {
    // Get employee information
    const employee = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, employeeCode))
      .limit(1);

    if (employee.length === 0) {
      throw new Error(`Employee not found: ${employeeCode}`);
    }

    // Analyze historical patterns
    const patterns = await this.analyzeEmployeePatterns(employeeCode);
    
    // Prepare data for AI analysis
    const prompt = this.buildAnalysisPrompt(employee[0], patterns, targetDate);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an AI attendance analyst. Analyze employee attendance patterns and provide accurate predictions with actionable suggestions. Respond with JSON format only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{}');
      
      // Process AI response into structured result
      const prediction: PredictionResult = {
        employeeCode,
        predictionDate: targetDate,
        attendanceLikelihood: Math.min(100, Math.max(0, aiResult.attendanceLikelihood || patterns.attendanceRate)),
        arrivalTimePrediction: aiResult.arrivalTimePrediction || patterns.averageArrivalTime,
        riskLevel: this.determineRiskLevel(aiResult.attendanceLikelihood || patterns.attendanceRate, patterns.lateFrequency),
        confidenceScore: aiResult.confidenceScore || 75,
        suggestions: aiResult.suggestions || this.generateBasicSuggestions(patterns),
        patterns,
        factors: aiResult.contributingFactors || []
      };

      // Save prediction to database
      await this.savePrediction(prediction);
      
      return prediction;

    } catch (error) {
      console.error('AI prediction failed, using statistical fallback:', error);
      
      // Fallback to statistical prediction
      return this.generateStatisticalPrediction(employeeCode, patterns, targetDate);
    }
  }

  /**
   * Generate bulk predictions for all active employees
   */
  async generateBulkPredictions(targetDate: string): Promise<PredictionResult[]> {
    const employees = await db
      .select({ employeeCode: employeeRecords.employeeCode })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));

    const predictions: PredictionResult[] = [];
    
    // Process in batches of 10 to avoid rate limits
    for (let i = 0; i < employees.length; i += 10) {
      const batch = employees.slice(i, i + 10);
      const batchPromises = batch.map(emp => 
        this.generatePrediction(emp.employeeCode, targetDate).catch(err => {
          console.error(`Prediction failed for ${emp.employeeCode}:`, err);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      predictions.push(...batchResults.filter(p => p !== null) as PredictionResult[]);
      
      // Add delay between batches
      if (i + 10 < employees.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return predictions;
  }

  /**
   * Generate AI insights for attendance improvement
   */
  async generateInsights(employeeCode: string): Promise<any[]> {
    const patterns = await this.analyzeEmployeePatterns(employeeCode, 60); // 60 days analysis
    
    const insights = [];
    
    // Attendance rate insight
    if (patterns.attendanceRate < 80) {
      insights.push({
        type: 'pattern',
        title: 'Low Attendance Rate',
        description: `Current attendance rate is ${patterns.attendanceRate.toFixed(1)}%, below the 80% threshold.`,
        severity: patterns.attendanceRate < 60 ? 'critical' : 'warning',
        suggestions: [
          'Schedule a one-on-one meeting to discuss attendance challenges',
          'Review personal circumstances affecting attendance',
          'Consider flexible work arrangements if appropriate'
        ]
      });
    }

    // Late arrival pattern
    if (patterns.lateFrequency > 20) {
      insights.push({
        type: 'pattern',
        title: 'Frequent Late Arrivals',
        description: `Employee arrives late ${patterns.lateFrequency.toFixed(1)}% of the time.`,
        severity: 'warning',
        suggestions: [
          'Discuss morning routine and commute challenges',
          'Consider adjusted start time if operationally feasible',
          'Provide time management resources and training'
        ]
      });
    }

    // Consistency insight
    if (patterns.consistencyScore < 70) {
      insights.push({
        type: 'trend',
        title: 'Inconsistent Attendance Pattern',
        description: 'Attendance shows high variability week-to-week.',
        severity: 'info',
        suggestions: [
          'Identify patterns in absences (specific days, times)',
          'Check for external factors affecting consistency',
          'Implement attendance improvement plan with clear goals'
        ]
      });
    }

    return insights;
  }

  // Helper methods
  private buildAnalysisPrompt(employee: any, patterns: AttendancePattern, targetDate: string): string {
    return `Analyze the attendance pattern for employee and predict attendance for ${targetDate}.

Employee Information:
- Name: ${employee.firstName} ${employee.lastName}
- Department: ${employee.department}
- Designation: ${employee.designation}

Historical Patterns (Last 30 days):
- Attendance Rate: ${patterns.attendanceRate.toFixed(1)}%
- Average Arrival Time: ${patterns.averageArrivalTime}
- Late Frequency: ${patterns.lateFrequency.toFixed(1)}%
- Consistency Score: ${patterns.consistencyScore.toFixed(1)}/100

Weekly Patterns: ${JSON.stringify(patterns.weeklyPatterns)}
Monthly Trends: ${JSON.stringify(patterns.monthlyTrends)}

Target Date: ${targetDate} (${new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' })})

Please provide:
{
  "attendanceLikelihood": number (0-100),
  "arrivalTimePrediction": "HH:MM:SS",
  "confidenceScore": number (0-100),
  "contributingFactors": ["factor1", "factor2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;
  }

  private calculateAverageTime(times: string[]): string {
    if (times.length === 0) return "09:00:00";
    
    const totalMinutes = times.reduce((sum, time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return sum + (hours * 60) + minutes;
    }, 0);
    
    const avgMinutes = Math.round(totalMinutes / times.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  }

  private calculateConsistencyScore(records: any[]): number {
    if (records.length < 7) return 50;
    
    const attendanceDays = records.filter(r => r.checkInTime).length;
    const totalDays = records.length;
    const baseScore = (attendanceDays / totalDays) * 100;
    
    // Reduce score for irregular patterns
    const irregularityPenalty = this.calculateIrregularityPenalty(records);
    
    return Math.max(0, Math.min(100, baseScore - irregularityPenalty));
  }

  private calculateIrregularityPenalty(records: any[]): number {
    // Calculate penalty based on gaps and irregular patterns
    let penalty = 0;
    const sortedRecords = records.sort((a, b) => new Date(a.attendanceDate).getTime() - new Date(b.attendanceDate).getTime());
    
    for (let i = 1; i < sortedRecords.length; i++) {
      const current = sortedRecords[i];
      const previous = sortedRecords[i - 1];
      
      if (!current.checkInTime && previous.checkInTime) {
        penalty += 5; // Penalty for inconsistency
      }
    }
    
    return Math.min(30, penalty); // Max 30 point penalty
  }

  private determineRiskLevel(attendanceLikelihood: number, lateFrequency: number): 'low' | 'medium' | 'high' | 'critical' {
    if (attendanceLikelihood < 50 || lateFrequency > 50) return 'critical';
    if (attendanceLikelihood < 70 || lateFrequency > 30) return 'high';
    if (attendanceLikelihood < 85 || lateFrequency > 15) return 'medium';
    return 'low';
  }

  private generateBasicSuggestions(patterns: AttendancePattern): string[] {
    const suggestions = [];
    
    if (patterns.attendanceRate < 80) {
      suggestions.push("Schedule a meeting to discuss attendance challenges");
      suggestions.push("Review personal circumstances affecting attendance");
    }
    
    if (patterns.lateFrequency > 20) {
      suggestions.push("Discuss morning routine optimization");
      suggestions.push("Consider flexible start time arrangement");
    }
    
    if (patterns.consistencyScore < 70) {
      suggestions.push("Implement structured attendance improvement plan");
      suggestions.push("Set weekly attendance goals with regular check-ins");
    }
    
    return suggestions.length > 0 ? suggestions : ["Continue maintaining good attendance patterns"];
  }

  private async generateStatisticalPrediction(employeeCode: string, patterns: AttendancePattern, targetDate: string): Promise<PredictionResult> {
    const dayOfWeek = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' });
    const dayAttendanceRate = patterns.weeklyPatterns[dayOfWeek] || patterns.attendanceRate;
    
    return {
      employeeCode,
      predictionDate: targetDate,
      attendanceLikelihood: Math.round(dayAttendanceRate),
      arrivalTimePrediction: patterns.averageArrivalTime,
      riskLevel: this.determineRiskLevel(dayAttendanceRate, patterns.lateFrequency),
      confidenceScore: 65, // Lower confidence for statistical prediction
      suggestions: this.generateBasicSuggestions(patterns),
      patterns,
      factors: ['Historical attendance pattern', 'Day of week tendency']
    };
  }

  private async savePrediction(prediction: PredictionResult): Promise<void> {
    try {
      await db.insert(attendancePredictions).values({
        employeeCode: prediction.employeeCode,
        predictionDate: prediction.predictionDate,
        predictionType: 'daily',
        attendanceLikelihood: prediction.attendanceLikelihood.toString(),
        arrivalTimePrediction: prediction.arrivalTimePrediction,
        riskLevel: prediction.riskLevel,
        confidenceScore: prediction.confidenceScore.toString(),
        historicalPatterns: prediction.patterns,
        contributingFactors: prediction.factors,
        aiSuggestions: prediction.suggestions,
        modelVersion: 'v1.0'
      });
    } catch (error) {
      console.error('Failed to save prediction:', error);
    }
  }
}

export const aiAttendancePredictionService = new AIAttendancePredictionService();