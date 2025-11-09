import React, { useState } from 'react';
import { Eye, Play } from 'lucide-react';
import DetailedExamViewModal from './DetailedExamViewModal';
import AnimatedExamReviewModal from './AnimatedExamReviewModal';

// Demo component showing how to use both modals
export default function ExamModalDemo() {
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [showAnimatedModal, setShowAnimatedModal] = useState(false);

  // Sample exam data
  const examData = {
    examTitle: "Mathematics Quiz - Advanced Level",
    questions: [
      {
        id: 1,
        question: "What is the derivative of x²?",
        options: ["2x", "x", "2", "x²"],
        correctAnswer: "2x",
        userAnswer: "2x",
        explanation: "The derivative of x² is 2x using the power rule: d/dx(x^n) = nx^(n-1)"
      },
      {
        id: 2,
        question: "What is the integral of 2x?",
        options: ["x²", "x² + C", "2x²", "x"],
        correctAnswer: "x² + C",
        userAnswer: "x²",
        explanation: "The integral of 2x is x² + C, where C is the constant of integration"
      },
      {
        id: 3,
        question: "What is the value of sin(90°)?",
        options: ["0", "1", "-1", "undefined"],
        correctAnswer: "1",
        userAnswer: "0",
        explanation: "sin(90°) = 1, as it represents the maximum value of the sine function"
      },
      {
        id: 4,
        question: "What is the limit of (x² - 1)/(x - 1) as x approaches 1?",
        options: ["0", "1", "2", "undefined"],
        correctAnswer: "2",
        userAnswer: "2",
        explanation: "Using L'Hôpital's rule or factoring: (x² - 1)/(x - 1) = (x + 1)(x - 1)/(x - 1) = x + 1, so the limit is 2"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Exam Review Modals Demo
          </h1>
          <p className="text-xl text-gray-600">
            Choose between a detailed view or an animated replay experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Detailed Modal Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Detailed Exam View
              </h2>
              <p className="text-gray-600">
                Navigate through questions with detailed answer analysis and explanations
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Question-by-question navigation
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Visual answer comparison
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Detailed explanations
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Progress indicators
              </div>
            </div>

            <button
              onClick={() => setShowDetailedModal(true)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Open Detailed View
            </button>
          </div>

          {/* Animated Modal Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Animated Review
              </h2>
              <p className="text-gray-600">
                Experience an animated replay of your exam with smooth transitions
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Smooth animations and transitions
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Auto-reveal answers with effects
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Interactive replay functionality
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Enhanced visual feedback
              </div>
            </div>

            <button
              onClick={() => setShowAnimatedModal(true)}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Open Animated Review
            </button>
          </div>
        </div>

        {/* Sample Data Preview */}
        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Sample Exam Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Exam Info:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>Title:</strong> {examData.examTitle}</li>
                <li><strong>Questions:</strong> {examData.questions.length}</li>
                <li><strong>Correct:</strong> {examData.questions.filter(q => q.userAnswer === q.correctAnswer).length}</li>
                <li><strong>Wrong:</strong> {examData.questions.filter(q => q.userAnswer !== q.correctAnswer && q.userAnswer).length}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Question Preview:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {examData.questions.slice(0, 2).map((q, index) => (
                  <div key={q.id} className="p-2 bg-gray-50 rounded">
                    <strong>Q{q.id}:</strong> {q.question.substring(0, 50)}...
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DetailedExamViewModal
        isOpen={showDetailedModal}
        onClose={() => setShowDetailedModal(false)}
        examTitle={examData.examTitle}
        questions={examData.questions}
      />

      <AnimatedExamReviewModal
        isOpen={showAnimatedModal}
        onClose={() => setShowAnimatedModal(false)}
        examTitle={examData.examTitle}
        questions={examData.questions}
      />
    </div>
  );
}






