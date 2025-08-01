import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface AttendanceChartProps {
  data: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>;
  type?: "line" | "bar";
}

export function AttendanceChart({ data, type = "line" }: AttendanceChartProps) {
  const chartData = data.map(item => ({
    ...item,
    total: item.present + item.absent + item.late,
  }));

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            fontSize={12}
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tick={{ fill: '#9CA3AF' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1A1B3E',
              border: '1px solid #4B5563',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Legend 
            wrapperStyle={{ 
              color: '#9CA3AF',
              fontSize: '12px'
            }}
          />
          <Bar dataKey="present" fill="#10B981" name="Present" radius={[2, 2, 0, 0]} />
          <Bar dataKey="late" fill="#F59E0B" name="Late" radius={[2, 2, 0, 0]} />
          <Bar dataKey="absent" fill="#EF4444" name="Absent" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="date" 
          stroke="#9CA3AF"
          fontSize={12}
          tick={{ fill: '#9CA3AF' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          fontSize={12}
          tick={{ fill: '#9CA3AF' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#1A1B3E',
            border: '1px solid #4B5563',
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Legend 
          wrapperStyle={{ 
            color: '#9CA3AF',
            fontSize: '12px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="present" 
          stroke="#10B981" 
          strokeWidth={3}
          name="Present"
          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#10B981' }}
        />
        <Line 
          type="monotone" 
          dataKey="late" 
          stroke="#F59E0B" 
          strokeWidth={3}
          name="Late"
          dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#F59E0B' }}
        />
        <Line 
          type="monotone" 
          dataKey="absent" 
          stroke="#EF4444" 
          strokeWidth={3}
          name="Absent"
          dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#EF4444' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
