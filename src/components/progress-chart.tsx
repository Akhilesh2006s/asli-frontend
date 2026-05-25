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
        return <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />;
      case "neutral":
        return <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />;
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
      <CardContent className="space-y-3">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-xs sm:text-sm font-medium text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Subject-wise Progress */}
        <div className="space-y-2.5">
          <h4 className="text-sm font-medium text-gray-900">Subject-wise Progress</h4>
          {subjects.map((subject, index) => (
            <div key={subject.id || subject.name || `subject-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${subject.color}`}>
                  <span className="text-[10px] font-medium">
                    {subject.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-medium text-gray-900">{subject.name}</h3>
                    <Badge className={`shrink-0 text-[10px] ${getTrendColor(subject.trend)}`}>
                      {getTrendIcon(subject.trend)}
                      {subject.progress}%
                    </Badge>
                  </div>
                  <p className="mb-1.5 truncate text-xs text-gray-600">{subject.currentTopic}</p>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-pink-500 to-purple-600"
                      style={{
                        width: `${subject.progress}%`
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
          <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
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
