import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface QuestionGeneratorProps {
  classNumber: number;
  onBack: () => void;
}

export default function QuestionGenerator({ classNumber, onBack }: QuestionGeneratorProps) {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    numberOfQuestions: 10,
    difficulty: 'medium',
    subject: ''
  });

  useEffect(() => {
    fetchSubjectsForClass();
  }, [classNumber]);

  const fetchSubjectsForClass = async () => {
    try {
      setIsLoadingSubjects(true);
      const token = localStorage.getItem('authToken');
      
      // Fetch all subjects first, then filter by class if needed
      // For now, we'll fetch all subjects - you can filter by class later if needed
      const response = await fetch(`${API_BASE_URL}/api/super-admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch subjects',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.subject) {
      toast({
        title: 'Error',
        description: 'Please select a subject',
        variant: 'destructive'
      });
      return;
    }

    if (formData.numberOfQuestions <= 0 || formData.numberOfQuestions > 50) {
      toast({
        title: 'Error',
        description: 'Number of questions must be between 1 and 50',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsGenerating(true);
      setIsSuccess(false);
      setGeneratedQuestions([]);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/iq-rank-activities/generate-questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classNumber: classNumber.toString(),
          numberOfQuestions: formData.numberOfQuestions,
          difficulty: formData.difficulty,
          subjectId: formData.subject
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGeneratedQuestions(data.data.questions || []);
          setIsSuccess(true);
          toast({
            title: 'Success',
            description: `Successfully generated ${data.data.questions?.length || 0} questions`
          });
          
          // Reset form after successful generation
          setFormData({
            numberOfQuestions: 10,
            difficulty: 'medium',
            subject: ''
          });
        } else {
          throw new Error(data.message || 'Failed to generate questions');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate questions');
      }
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate questions',
        variant: 'destructive'
      });
      setIsSuccess(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedSubject = subjects.find(s => s._id === formData.subject);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Generate Questions for Class {classNumber}</h2>
          <p className="text-gray-600 mt-1">Use AI to generate MCQ questions for IQ/Rank Boost activities</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Question Generation Settings</CardTitle>
          <CardDescription>
            Configure the parameters for AI-generated questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Number of Questions */}
            <div className="space-y-2">
              <Label htmlFor="numberOfQuestions">Number of Questions</Label>
              <Input
                id="numberOfQuestions"
                type="number"
                min="1"
                max="50"
                value={formData.numberOfQuestions}
                onChange={(e) => setFormData({ ...formData, numberOfQuestions: parseInt(e.target.value) || 1 })}
                placeholder="Enter number of questions"
              />
              <p className="text-xs text-gray-500">Between 1 and 50 questions</p>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              {isLoadingSubjects ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 ? (
                      <SelectItem value="__no_subjects__" disabled>No subjects available</SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject._id} value={subject._id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !formData.subject || formData.numberOfQuestions <= 0}
              className="min-w-[150px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Questions'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {isSuccess && generatedQuestions.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">
                  Successfully Generated {generatedQuestions.length} Questions
                </h3>
                <p className="text-sm text-green-700">
                  Questions have been saved to the database for Class {classNumber}
                  {selectedSubject && ` - ${selectedSubject.name}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Questions Preview */}
      {generatedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Questions Preview</CardTitle>
            <CardDescription>
              Preview of the {generatedQuestions.length} questions that were generated and saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {generatedQuestions.map((question, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-gray-900">
                          Q{index + 1}. {question.questionText || question.question}
                        </p>
                        <Badge variant="outline" className="ml-2">
                          {question.difficulty || formData.difficulty}
                        </Badge>
                      </div>
                      
                      {question.options && question.options.length > 0 && (
                        <div className="space-y-2 ml-4">
                          {question.options.map((option: any, optIndex: number) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded ${
                                option.isCorrect || option === question.correctAnswer
                                  ? 'bg-green-100 border border-green-300'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <span>{option.text || option}</span>
                              {(option.isCorrect || option === question.correctAnswer) && (
                                <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {question.explanation && (
                        <div className="ml-4 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">Explanation: </span>
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

