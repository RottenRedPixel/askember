import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const EmberRadialChart = ({ size = 30 }) => {
  // Dummy data for the 3 concentric rings
  const outerRingData = [
    { name: 'Photos', value: 75, color: '#3b82f6' },
    { name: 'Empty', value: 25, color: 'transparent' }
  ];

  const middleRingData = [
    { name: 'Stories', value: 60, color: '#10b981' },
    { name: 'Empty', value: 40, color: 'transparent' }
  ];

  const innerRingData = [
    { name: 'Chats', value: 40, color: '#f59e0b' },
    { name: 'Empty', value: 60, color: 'transparent' }
  ];

  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Outer ring */}
          <Pie
            data={outerRingData}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.37}
            outerRadius={size * 0.45}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {outerRingData.map((entry, index) => (
              <Cell key={`outer-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          
          {/* Middle ring */}
          <Pie
            data={middleRingData}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.27}
            outerRadius={size * 0.35}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {middleRingData.map((entry, index) => (
              <Cell key={`middle-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          
          {/* Inner ring */}
          <Pie
            data={innerRingData}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.15}
            outerRadius={size * 0.25}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {innerRingData.map((entry, index) => (
              <Cell key={`inner-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmberRadialChart; 