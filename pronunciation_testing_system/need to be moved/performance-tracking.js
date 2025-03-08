// UserStats.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const UserStats = ({ userId, guestSessionId }) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchUserStats();
  }, [userId, guestSessionId]);
  
  const fetchUserStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = '/api/pronunciation-attempts/user_stats/';
      if (guestSessionId) {
        url += `?guest_session_id=${guestSessionId}`;
      }
      
      const response = await axios.get(url);
      setStats(response.data);
    } catch (err) {
      setError('Failed to load your statistics. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return <div className="text-center p-8">Loading statistics...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded text-center">
        {error}
      </div>
    );
  }
  
  if (!stats || stats.total_attempts === 0) {
    return (
      <div className="p-6 bg-gray-100 rounded-lg text-center">
        <h3 className="text-xl font-bold mb-2">No Pronunciation Data Yet</h3>
        <p className="mb-4">Take your first pronunciation test to see your statistics here.</p>
      </div>
    );
  }
  
  // Format progress data for chart
  const progressData = Object.entries(stats.progress_over_time).map(([date, data]) => ({
    date,
    score: data.avg_score,
    attempts: data.attempts_count
  }));
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6">Your Performance</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-gray-600">Total Tests</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.total_attempts}</p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-gray-600">Average Score</h3>
          <p className="text-3xl font-bold text-green-600">
            {Math.round(stats.average_score)}%
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-gray-600">Best Score</h3>
          <p className="text-3xl font-bold text-purple-600">
            {Math.round(stats.best_score)}%
          </p>
        </div>
      </div>
      
      {progressData.length > 1 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Progress Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  name="Average Score" 
                  stroke="#4f46e5" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-xl font-bold mb-4">Recent Attempts</h3>
        {stats.recent_attempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Date</th>
                  <th className="py-2 px-4 border-b text-left">Text</th>
                  <th className="py-2 px-4 border-b text-center">Overall</th>
                  <th className="py-2 px-4 border-b text-center">Correctness</th>
                  <th className="py-2 px-4 border-b text-center">Fluency</th>
                  <th className="py-2 px-4 border-b text-center">Clarity</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_attempts.map((attempt) => {
                  const date = new Date(attempt.created_at).toLocaleDateString();
                  return (
                    <tr key={attempt.id}>
                      <td className="py-2 px-4 border-b">{date}</td>
                      <td className="py-2 px-4 border-b">
                        {attempt.pronunciation_text.text.substring(0, 30)}...
                      </td>
                      <td className="py-2 px-4 border-b text-center font-bold">
                        {Math.round(attempt.overall_score)}%
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {Math.round(attempt.correctness_score)}%
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {Math.round(attempt.fluency_score)}%
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {Math.round(attempt.clarity_score)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent