import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DataPoint {
  date: string
  bullish: number
  bearish: number
  neutral: number
}

interface Props {
  data: DataPoint[]
}

export function SentimentChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} labelStyle={{ color: '#F3F4F6' }} />
        <Legend />
        <Line type="monotone" dataKey="bullish" stroke="#10B981" strokeWidth={2} />
        <Line type="monotone" dataKey="bearish" stroke="#EF4444" strokeWidth={2} />
        <Line type="monotone" dataKey="neutral" stroke="#F59E0B" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
