// Example of how to integrate the modals into your existing exam results component

import React, { useState } from 'react';
import { Eye, Play, BarChart3 } from 'lucide-react';
import DetailedExamViewModal from './DetailedExamViewModal';
import AnimatedExamReviewModal from './AnimatedExamReviewModal';

// Example integration in your exam results component
export default function ExamResultsWithModals({ examResult }) {
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [showAnimatedModal, setShowAnimatedModal] = useState(false);

  // Transform your existing exam result data to match the modal props
  const modalData = {
    examTitle: examResult.examTitle || examResult.exam?.title || 'Exam Review',
    questions: examResult.questions?.map((question, index) => ({
      id: index + 1,
      question: question.questionText || question.question,
      options: question.options?.map(opt => 
        typeof opt === 'string' ? opt : opt.text || opt.label || opt
      ) || [],
      correctAnswer: question.correctAnswer,
      userAnswer: examResult.answers?.[question._id] || examResult.answers?.[index],
      explanation: question.explanation
    })) || []
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Your existing exam results content */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {modalData.examTitle}
        </h2>
        <p className="text-gray-600">
          Score: {examResult.score || 0}% • {modalData.questions.length} Questions
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => setShowDetailedModal(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <Eye className="w-5 h-5" />
          <span>Detailed Review</span>
        </button>

        <button
          onClick={() => setShowAnimatedModal(true)}
          className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <Play className="w-5 h-5" />
          <span>Animated Review</span>
        </button>

        <button
          onClick={() => {/* Your existing detailed analysis logic */}}
          className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <BarChart3 className="w-5 h-5" />
          <span>View Analysis</span>
        </button>
      </div>

      {/* Modals */}
      <DetailedExamViewModal
        isOpen={showDetailedModal}
        onClose={() => setShowDetailedModal(false)}
        examTitle={modalData.examTitle}
        questions={modalData.questions}
      />

      <AnimatedExamReviewModal
        isOpen={showAnimatedModal}
        onClose={() => setShowAnimatedModal(false)}
        examTitle={modalData.examTitle}
        questions={modalData.questions}
      />
    </div>
  );
}

// Alternative: Add buttons to your existing detailed analysis component
export function AddModalButtonsToDetailedAnalysis({ examResult, questions }) {
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [showAnimatedModal, setShowAnimatedModal] = useState(false);

  const modalData = {
    examTitle: examResult.examTitle || 'Exam Review',
    questions: questions.map((question, index) => ({
      id: index + 1,
      question: question.questionText,
      options: question.options?.map(opt => 
        typeof opt === 'string' ? opt : opt.text || opt.label || opt
      ) || [],
      correctAnswer: question.correctAnswer,
      userAnswer: examResult.answers?.[question._id],
      explanation: question.explanation
    }))
  };

  return (
    <>
      {/* Add these buttons to your existing detailed analysis component */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowDetailedModal(true)}
          className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>Modal View</span>
        </button>

        <button
          onClick={() => setShowAnimatedModal(true)}
          className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Animated View</span>
        </button>
      </div>

      {/* Modals */}
      <DetailedExamViewModal
        isOpen={showDetailedModal}
        onClose={() => setShowDetailedModal(false)}
        examTitle={modalData.examTitle}
        questions={modalData.questions}
      />

      <AnimatedExamReviewModal
        isOpen={showAnimatedModal}
        onClose={() => setShowAnimatedModal(false)}
        examTitle={modalData.examTitle}
        questions={modalData.questions}
      />
    </>
  );
}






