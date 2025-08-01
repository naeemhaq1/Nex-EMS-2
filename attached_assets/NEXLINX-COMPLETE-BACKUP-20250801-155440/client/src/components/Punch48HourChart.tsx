import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PunchData {
  hour: string;
  punchIn: number;
  punchOut: number;
  grace: number;
}

interface Punch48HourData {
  hourlyData: PunchData[];
  totalPunchIn: number;
  totalPunchOut: number;
  totalGrace: number;
}

export function Punch48HourChart() {
  const { data: punchData, isLoading } = useQuery<Punch48HourData>({
    queryKey: ['/api/admin/punch-48hour-data'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Generate last 48 hours labels (oldest to newest, left to right)
  const generateHourLabels = () => {
    const labels = [];
    const now = new Date();
    
    for (let i = 47; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hourLabel = hour.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        hour12: false,
        timeZone: 'Asia/Karachi'
      });
      const dayLabel = hour.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Karachi'
      });
      labels.push(`${hourLabel}\n${dayLabel}`);
    }
    
    return labels;
  };

  const chartData = {
    labels: generateHourLabels(),
    datasets: [
      {
        label: 'Punch In',
        data: punchData?.hourlyData?.map(d => d.punchIn) || Array(48).fill(0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        stack: 'Stack 0',
      },
      {
        label: 'Punch Out',
        data: punchData?.hourlyData?.map(d => d.punchOut) || Array(48).fill(0),
        backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        stack: 'Stack 0',
      },
      {
        label: 'Grace Period',
        data: punchData?.hourlyData?.map(d => d.grace) || Array(48).fill(0),
        backgroundColor: 'rgba(251, 146, 60, 0.8)', // Orange
        borderColor: 'rgba(251, 146, 60, 1)',
        borderWidth: 1,
        stack: 'Stack 0',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          display: true,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 9,
          },
          maxRotation: 45,
          minRotation: 0,
        },
        title: {
          display: true,
          text: 'Time (Last 48 Hours)',
          color: '#ffffff',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          display: true,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
          beginAtZero: true,
          stepSize: 1,
        },
        title: {
          display: true,
          text: 'Punch Count',
          color: '#ffffff',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ffffff',
          font: {
            size: 11,
          },
          usePointStyle: true,
          pointStyle: 'rect',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(30, 30, 60, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          title: (context: any) => {
            return `Hour: ${context[0].label}`;
          },
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const data = punchData?.hourlyData?.[index];
            if (data) {
              const total = data.punchIn + data.punchOut + data.grace;
              return [`Total Activity: ${total}`];
            }
            return [];
          },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-400">Loading punch data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-500/20 rounded-lg p-2">
          <div className="text-green-400 text-sm font-semibold">Punch In</div>
          <div className="text-white text-lg">{punchData?.totalPunchIn || 0}</div>
        </div>
        <div className="bg-red-500/20 rounded-lg p-2">
          <div className="text-red-400 text-sm font-semibold">Punch Out</div>
          <div className="text-white text-lg">{punchData?.totalPunchOut || 0}</div>
        </div>
        <div className="bg-orange-500/20 rounded-lg p-2">
          <div className="text-orange-400 text-sm font-semibold">Grace</div>
          <div className="text-white text-lg">{punchData?.totalGrace || 0}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}