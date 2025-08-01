import { Request, Response } from "express";
import { db } from "../db";
import { attendanceRecords, employeeRecords } from "@shared/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";

export async function getEmployeeAttendanceDetails(req: Request, res: Response) {
  try {
    const { employeeCode, startDate, endDate } = req.query;
    
    if (!employeeCode) {
      return res.status(400).json({ error: "Employee code is required" });
    }
    
    // Find employee by code
    const employee = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, employeeCode as string))
      .limit(1);
    
    if (!employee.length) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Build query conditions
    const conditions = [eq(attendanceRecords.employeeId, employee[0].id)];
    
    if (startDate) {
      conditions.push(gte(attendanceRecords.date, new Date(startDate as string)));
    }
    
    if (endDate) {
      conditions.push(lte(attendanceRecords.date, new Date(endDate as string)));
    }
    
    // Get attendance records
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(and(...conditions))
      .orderBy(asc(attendanceRecords.date));
    
    // Transform records for the frontend
    const details = records.map(record => ({
      date: record.date.toISOString(),
      checkIn: record.checkIn?.toISOString() || null,
      checkOut: record.checkOut?.toISOString() || null,
      hoursWorked: calculateHours(record.checkIn, record.checkOut),
      status: determineStatus(record)
    }));
    
    res.json(details);
  } catch (error) {
    console.error('Error fetching employee attendance details:', error);
    res.status(500).json({ error: 'Failed to fetch attendance details' });
  }
}

function calculateHours(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, diff / (1000 * 60 * 60));
}

function determineStatus(record: any): string {
  if (!record.checkIn) return 'absent';
  
  const checkInTime = new Date(record.checkIn);
  const expectedTime = new Date(record.date);
  expectedTime.setHours(9, 0, 0, 0); // 9 AM expected time
  
  if (checkInTime > expectedTime) {
    return 'late';
  }
  
  return 'present';
}