import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SubjectProgress {
  id: string;
  name: string;
  progress: number;
  trend: "up" | "down" | "neutral";
  currentTopic: string;
  color: string;
}

interface ProgressChartProps {
  subjects: SubjectProgress[];
  overallProgress: number;
  className?: string;
}

export default function ProgressChart({ subjects, overallProgress, className }: ProgressChartProps) {
  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "neutral":
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return "text-green-600 bg-green-100";
      case "down":
        return "text-red-600 bg-red-100";
      case "neutral":
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Learning Progress</span>
          <Badge variant="outline" className="text-primary">
            {overallProgress}% Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Subject-wise Progress */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Subject-wise Progress</h4>
          {subjects.map((subject) => (
            <div key={subject.id} className="subject-progress-card">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${subject.color}`}>
                  <span className="text-sm font-medium">
                    {subject.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900">{subject.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={getTrendColor(subject.trend)}>
                        {getTrendIcon(subject.trend)}
                        {subject.progress}%
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{subject.currentTopic}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${subject.progress}%`,
                        backgroundColor: subject.color.includes('blue') ? '#3B82F6' :
                          subject.color.includes('green') ? '#10B981' :
                          subject.color.includes('purple') ? '#8B5CF6' :
                          subject.color.includes('red') ? '#EF4444' : '#F59E0B'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Goals */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
          <h4 className="font-medium text-blue-900 mb-2">This Week's Goals</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Complete 3 video lectures</li>
            <li>• Practice 50 questions daily</li>
            <li>• Take 1 mock test</li>
            <li>• Review weak topics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
