import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/navigation";
import TestAnalysis from "@/components/test-analysis";
import { 
  FileText, 
  Clock, 
  Users, 
  Play, 
  CheckCircle,
  Target,
  Trophy,
  BarChart3,
  Timer,
  AlertCircle
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PracticeTest, Question, TestAttempt } from "@shared/schema";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "user-1";

export default function PracticeTests() {
  const [selectedTest, setSelectedTest] = useState<PracticeTest | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTestActive, setIsTestActive] = useState(false);
  const [testResult, setTestResult] = useState<{ attempt: TestAttempt; aiAnalysis?: any } | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string>("all");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch practice tests
  const { data: tests = [], isLoading: testsLoading } = useQuery<PracticeTest[]>({
    queryKey: ["/api/practice-tests"],
  });

  // Fetch user's test attempts
  const { data: attempts = [] } = useQuery<TestAttempt[]>({
    queryKey: ["/api/users", MOCK_USER_ID, "test-attempts"],
  });

  // Submit test mutation
  const submitTestMutation = useMutation({
    mutationFn: async (testData: {
      userId: string;
      testId: string;
      responses: { questionId: string; selectedAnswer: number; timeSpent: number }[];
      timeSpent: number;
    }) => {
      const response = await apiRequest("POST", "/api/test-attempts", testData);
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      setIsTestActive(false);
      setSelectedTest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users", MOCK_USER_ID, "test-attempts"] });
      toast({
        title: "Test Submitted Successfully",
        description: "Your test has been evaluated and results are ready.",
      });
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit test. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter tests
  const filteredTests = tests.filter(test => 
    selectedExamType === "all" || test.examType === selectedExamType
  );

  const recentTests = attempts.slice(0, 3);

  const startTest = async (test: PracticeTest) => {
    try {
      const response = await apiRequest("GET", `/api/practice-tests/${test.id}`);
      const data = await response.json();
      setSelectedTest(test);
      setTestQuestions(data.questions);
      setCurrentQuestion(0);
      setAnswers({});
      setTimeLeft(test.duration);
      setIsTestActive(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start test. Please try again.",
        variant: "destructive",
      });
    }
  };

  const submitTest = () => {
    if (!selectedTest || !isTestActive) return;

    const responses = testQuestions.map((question, index) => ({
      questionId: question.id!,
      selectedAnswer: answers[question.id!] || 0,
      timeSpent: Math.floor(selectedTest.duration / testQuestions.length), // Simplified
    }));

    submitTestMutation.mutate({
      userId: MOCK_USER_ID,
      testId: selectedTest.id!,
      responses,
      timeSpent: selectedTest.duration - timeLeft,
    });
  };

  const nextQuestion = () => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Test Interface
  if (isTestActive && selectedTest && testQuestions.length > 0) {
    const currentQ = testQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / testQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Test Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{selectedTest.title}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {testQuestions.length}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="flex items-center">
                  <Timer className="w-3 h-3 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
                <Button 
                  variant="outline" 
                  onClick={submitTest}
                  disabled={submitTestMutation.isPending}
                >
                  Submit Test
                </Button>
              </div>
            </div>
            <Progress value={progress} className="mt-2" />
          </div>
        </div>

        {/* Question Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Question {currentQuestion + 1}
                </CardTitle>
                <Badge className={getDifficultyColor(currentQ.difficulty || 'Medium')}>
                  {currentQ.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-gray-900 text-lg leading-relaxed">
                {currentQ.questionText}
              </div>

              {currentQ.options && (
                <RadioGroup
                  value={answers[currentQ.id!]?.toString()}
                  onValueChange={(value) => setAnswers({
                    ...answers,
                    [currentQ.id!]: parseInt(value)
                  })}
                >
                  {currentQ.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={prevQuestion} 
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-500">
                  {Object.keys(answers).length} of {testQuestions.length} answered
                </div>
                {currentQuestion === testQuestions.length - 1 ? (
                  <Button 
                    onClick={submitTest}
                    disabled={submitTestMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Submit Test
                  </Button>
                ) : (
                  <Button onClick={nextQuestion}>
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Test Results
  if (testResult) {
    return (
      <>
        <Navigation />
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isMobile ? 'pb-20' : ''}`}>
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setTestResult(null)}
              className="mb-4"
            >
              ← Back to Tests
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Test Results</h1>
          </div>
          <TestAnalysis 
            attempt={testResult.attempt} 
            aiAnalysis={testResult.aiAnalysis}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isMobile ? 'pb-20' : ''}`}>
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Practice Tests & Assessments</h1>
          <p className="text-gray-600">Board-mapped practice tests with instant AI evaluation</p>
        </div>

        {/* Filter */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by Exam Type:</label>
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Exam Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exam Types</SelectItem>
                  <SelectItem value="JEE_MAIN">JEE Main</SelectItem>
                  <SelectItem value="JEE_ADVANCED">JEE Advanced</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                  <SelectItem value="CHAPTER_TEST">Chapter Test</SelectItem>
                  <SelectItem value="MOCK_TEST">Mock Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Available Tests */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Tests</h2>
            
            {testsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredTests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
                  <p className="text-gray-600">
                    No practice tests are available for the selected exam type.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTests.map((test) => (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{test.title}</h3>
                            <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <FileText className="w-3 h-3 mr-1" />
                                {test.totalQuestions} Questions
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {Math.floor(test.duration / 3600)}h {Math.floor((test.duration % 3600) / 60)}m
                              </span>
                              <span className="flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {test.examType.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className="text-xs">New</Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getDifficultyColor(test.difficulty)}`}
                              >
                                {test.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => startTest(test)}
                          className="bg-primary text-white hover:bg-primary/90"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Recent Test Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentTests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No tests taken yet</p>
                ) : (
                  recentTests.map((attempt) => {
                    const accuracy = Math.round((attempt.score / attempt.totalQuestions) * 100);
                    return (
                      <div key={attempt.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">Test Result</span>
                          <Badge className={accuracy >= 75 ? 'bg-green-100 text-green-800' : 
                                         accuracy >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                                         'bg-red-100 text-red-800'}>
                            {accuracy}%
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          Score: {attempt.score}/{attempt.totalQuestions}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(attempt.completedAt!).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Performance Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Performance Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {attempts.length}
                  </div>
                  <p className="text-sm text-gray-600">Tests Taken</p>
                </div>
                
                {attempts.length > 0 && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.totalQuestions), 0) / attempts.length * 100)}%
                      </div>
                      <p className="text-sm text-gray-600">Average Score</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.max(...attempts.map(attempt => Math.round((attempt.score / attempt.totalQuestions) * 100)))}%
                      </div>
                      <p className="text-sm text-gray-600">Best Score</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Test Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Test Taking Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Read questions carefully before answering
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Manage your time effectively
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Review your answers before submission
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Use elimination method for difficult questions
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
