import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Rocket, CheckCircle2, XCircle, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
	{
		title: 'Tutor for Students,\nAssistant for Teachers',
		description: [
			'Teacher assigns homework on schedule',
			'AI guides students to complete homework and learn'
		],
		card: {
			badge: 'Physics Homework',
			questionLabel: 'Q:',
			options: ['A:', ' ', ' ', ' '],
			showPointer: false,
			showHint: false,
		},
	},
	{
		title: 'Tutor for Students,\nAssistant for Teachers',
		description: [
			'Teacher assigns homework on schedule',
			'AI guides students to complete homework and learn'
		],
		card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '•', '•', '•'], showPointer: true, showHint: false },
	},
	{
		title: 'Tutor for Students,\nAssistant for Teachers',
		description: [
			'Teacher assigns homework on schedule',
			'AI guides students to complete homework and learn'
		],
		card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '○', '●', '○'], showPointer: true, showHint: false },
	},
	{
		title: 'Tutor for Students,\nAssistant for Teachers',
		description: [
			'Teacher assigns homework on schedule',
			'AI guides students to complete homework and learn'
		],
		card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '✗', '○', '○'], showPointer: false, showHint: false },
	},
	{
		title: 'Tutor for Students,\nAssistant for Teachers',
		description: [
			'Teacher assigns homework on schedule',
			'AI guides students to complete homework and learn'
		],
		card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '✗', '○', '○'], showPointer: false, showHint: true },
	},
];

export default function Onboarding() {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 3500);
		return () => clearInterval(t);
	}, []);

	const slide = slides[index];

	return (
		<div className="min-h-screen flex items-center justify-center bg-white">
			<div className="w-[360px] h-[720px] border rounded-[28px] shadow-2xl overflow-hidden relative bg-white">
				{/* Status bar mock */}
				<div className="h-10 flex items-center justify-between px-4 text-[10px] text-gray-500">
					<span>9:43</span>
					<div className="flex gap-2">
						<span>4G</span>
						<span>84%</span>
					</div>
				</div>

				{/* Content */}
				<div className="px-6">
					<h1 className="text-[22px] leading-7 font-semibold text-[#2a2438] whitespace-pre-line">
						{slide.title}
					</h1>
					{/* Dots */}
					<div className="flex items-center gap-2 mt-4 mb-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-[#6c63ff]' : 'w-2 bg-gray-300'}`} />
						))}
					</div>

					{/* Info bubbles */}
					<div className="space-y-2">
						{slide.description.map((t, i) => (
							<div key={i} className="bg-[#f5f2ff] border border-[#e8e4ff] text-[12px] rounded-xl px-4 py-3 shadow-sm">
								<div className="font-semibold text-[#2a2438] flex items-center gap-2">
									<span className="inline-block w-5 h-5 rounded-full bg-[#6c63ff] text-white text-[11px] flex items-center justify-center">{i + 1}</span>
									<span>{t.split(' ')[0]} {t.slice(t.indexOf(' ') + 1)}</span>
								</div>
							</div>
						))}
					</div>

					{/* Homework card */}
					<motion.div key={index} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="mt-4 relative">
						<div className="w-full rounded-2xl border shadow-md bg-white">
							<div className="px-4 pt-3">
								<span className="inline-block text-[10px] bg-[#ff6b6b] text-white px-2 py-1 rounded-full">#Physics Homework</span>
							</div>
							<div className="px-4 py-3 text-[12px]">
								<div className="text-[#8a8a9e] mb-2">Q:</div>
								<div className="h-20 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border flex items-center justify-center">
									<div className="text-gray-400 text-xs">Physics question with graph</div>
								</div>
								<div className="mt-3 space-y-2">
									{slide.card.options.map((o, i) => (
										<div key={i} className={`h-8 rounded-lg border flex items-center px-3 text-[12px] ${i===1 && slide.card.options[1]==='●' ? 'border-[#6c63ff] bg-[#f3f2ff]' : 'border-gray-200'}`}>
											<span className="mr-2">{['A','B','C','D'][i] || ''}</span>
											<div className="flex-1 h-3 bg-gray-100 rounded" />
											{i===1 && slide.card.options[1]==='●' && <div className="ml-2 w-2 h-2 bg-[#6c63ff] rounded-full" />}
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Floating hint */}
						{slide.card.showHint && (
							<motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="absolute right-10 bottom-16">
								<div className="bg-white border text-[11px] rounded-xl shadow-lg px-4 py-2">
									Try this formula by keeping velocity constant!
								</div>
								<div className="mt-2 w-6 h-6 rounded-full bg-[#6c63ff] text-white flex items-center justify-center shadow">
									<HelpCircle className="w-3 h-3" />
								</div>
							</motion.div>
						)}
					</motion.div>
				</div>

				{/* Bottom swipe indicator */}
				<div className="absolute bottom-3 inset-x-0 flex items-center justify-center">
					<div className="w-24 h-1.5 bg-gray-200 rounded-full" />
				</div>
			</div>
		</div>
	);
}
