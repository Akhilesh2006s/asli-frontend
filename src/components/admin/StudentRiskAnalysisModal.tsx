import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Brain,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Download,
  Send
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface StudentRiskAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName?: string;
  isSuperAdmin?: boolean;
  analysisType?: 'comprehensive' | 'quick' | 'subject-specific';
  timeRange?: '30days' | '90days' | 'all';
}

interface AnalysisData {
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
  analysis: {
    summary: string;
    trends: string;
    strengths: string[];
    weaknesses: string[];
    rootCauses: string[];
  };
  predictions: {
    nextExamPrediction: number;
    confidence: number;
    trend: 'declining' | 'stable' | 'improving';
  };
  interventions: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    expectedImpact: string;
  }>;
  subjectBreakdown: {
    [key: string]: {
      performance: 'strong' | 'average' | 'weak';
      trend: 'improving' | 'stable' | 'declining';
      recommendation: string;
    };
  };
  generatedAt?: string;
  dataPoints?: number;
}

export function StudentRiskAnalysisModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  isSuperAdmin = false,
  analysisType = 'comprehensive',
  timeRange = '90days'
}: StudentRiskAnalysisModalProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const fetchAnalysis = async () => {
    if (!studentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const endpoint = isSuperAdmin 
        ? `${API_BASE_URL}/api/super-admin/ai/student-risk-analysis`
        : `${API_BASE_URL}/api/admin/ai/student-risk-analysis`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          analysisType,
          timeRange
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned ${response.status} ${response.statusText}. The endpoint may not be available.`);
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setAnalysisData(data.data);
      } else {
        setError(data.message || 'Failed to analyze student risk');
        toast({
          title: 'Error',
          description: data.message || 'Failed to analyze student risk',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analysis');
      toast({
        title: 'Error',
        description: err.message || 'Failed to fetch analysis',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && studentId) {
      fetchAnalysis();
    } else {
      setAnalysisData(null);
      setError(null);
    }
  }, [open, studentId, analysisType, timeRange]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'strong':
        return 'text-green-600';
      case 'weak':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-orange-500" />
            AI Student Risk Analysis
            {studentName && (
              <span className="text-base font-normal text-gray-600">
                - {studentName}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Comprehensive AI-powered analysis of student performance patterns and risk assessment
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
            <p className="text-gray-600">Analyzing student performance with AI...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysisData && !isLoading && (
          <div className="space-y-6">
            {/* Risk Level Card */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Assessment
                  </CardTitle>
                  <Badge className={`${getRiskColor(analysisData.riskLevel)} text-sm font-semibold px-3 py-1`}>
                    {analysisData.riskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Risk Score</span>
                      <span className="text-lg font-bold">{Math.round(analysisData.riskScore * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          analysisData.riskLevel === 'high' ? 'bg-red-500' :
                          analysisData.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${analysisData.riskScore * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{analysisData.analysis.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">{analysisData.analysis.trends}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold">Strengths</span>
                      </div>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {analysisData.analysis.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-semibold">Weaknesses</span>
                      </div>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {analysisData.analysis.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-600 mt-1">•</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Root Causes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Root Causes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisData.analysis.rootCauses.map((cause, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-orange-500 mt-1">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Next Exam Prediction</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(analysisData.predictions.nextExamPrediction)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Confidence</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round(analysisData.predictions.confidence * 100)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Trend</p>
                    <div className="flex items-center justify-center gap-2">
                      {getTrendIcon(analysisData.predictions.trend)}
                      <p className="text-lg font-semibold capitalize">
                        {analysisData.predictions.trend}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interventions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommended Interventions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisData.interventions.map((intervention, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        intervention.priority === 'high' ? 'border-red-200 bg-red-50' :
                        intervention.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge
                          className={
                            intervention.priority === 'high' ? 'bg-red-600' :
                            intervention.priority === 'medium' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }
                        >
                          {intervention.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{intervention.action}</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Reasoning:</span> {intervention.reasoning}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Expected Impact:</span> {intervention.expectedImpact}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subject Breakdown */}
            {Object.keys(analysisData.subjectBreakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Subject-wise Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analysisData.subjectBreakdown).map(([subject, data]) => (
                      <div key={subject} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{subject}</h4>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(data.trend)}
                            <Badge
                              className={
                                data.performance === 'strong' ? 'bg-green-100 text-green-800' :
                                data.performance === 'weak' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {data.performance}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{data.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            {analysisData.generatedAt && (
              <div className="text-xs text-gray-500 text-center pt-4 border-t">
                <div className="flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Generated: {new Date(analysisData.generatedAt).toLocaleString()}
                  </span>
                  {analysisData.dataPoints && (
                    <span>Based on {analysisData.dataPoints} exam{analysisData.dataPoints !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button 
                onClick={async () => {
                  if (!analysisData) return;
                  setIsDownloading(true);
                  try {
                    const token = localStorage.getItem('authToken');
                    const endpoint = isSuperAdmin 
                      ? `${API_BASE_URL}/api/super-admin/ai/student-risk-analysis/download-send`
                      : `${API_BASE_URL}/api/admin/ai/student-risk-analysis/download-send`;

                    const response = await fetch(endpoint, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        studentId,
                        analysisData
                      })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                      // Download the PDF
                      const downloadUrl = isSuperAdmin
                        ? `${API_BASE_URL}/api/super-admin/reports/download/${data.data.reportId}`
                        : `${API_BASE_URL}/api/admin/reports/download/${data.data.reportId}`;
                      
                      const downloadResponse = await fetch(downloadUrl, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });

                      if (downloadResponse.ok) {
                        const blob = await downloadResponse.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = data.data.filename;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);

                        toast({
                          title: 'Success',
                          description: 'PDF downloaded and sent to student successfully!',
                        });
                      }
                    } else {
                      throw new Error(data.message || 'Failed to generate PDF');
                    }
                  } catch (err: any) {
                    toast({
                      title: 'Error',
                      description: err.message || 'Failed to download PDF',
                      variant: 'destructive'
                    });
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                disabled={isDownloading || isSending}
                className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF & Send to Student
                  </>
                )}
              </Button>
              <Button onClick={fetchAnalysis} variant="default">
                <Sparkles className="h-4 w-4 mr-2" />
                Refresh Analysis
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

