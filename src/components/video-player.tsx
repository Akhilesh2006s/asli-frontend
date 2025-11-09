import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Pause, 
  Volume2, 
  Settings, 
  FileText, 
  Map, 
  MessageCircle,
  Download,
  BookOpen,
  Clock
} from "lucide-react";
import type { VideoLecture } from "@shared/schema";

interface VideoPlayerProps {
  video: VideoLecture;
  onClose?: () => void;
}

export default function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(video.duration || 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl h-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(duration)}
              </Badge>
              <Badge variant="outline" className={`${
                video.difficulty === 'Easy' ? 'text-green-600' : 
                video.difficulty === 'Medium' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {video.difficulty}
              </Badge>
              <Badge variant="outline">{video.language}</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Video Player */}
          <div className="flex-1 flex flex-col bg-black">
            {/* Video Area */}
            <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-white text-center">
                  <Play className="w-24 h-24 mx-auto mb-4 opacity-50" />
                  <p className="text-lg opacity-50">Video Player</p>
                </div>
              )}
              
              {/* Play/Pause Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </Button>
              </div>
            </div>

            {/* Video Controls */}
            <div className="bg-black p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-600 rounded-full h-1">
                  <div 
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-white text-xs mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-white hover:bg-white/10"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <Volume2 className="w-5 h-5" />
                  </Button>
                  <span className="text-white text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <Settings className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-96 border-l bg-gray-50 flex flex-col">
            <Tabs defaultValue="notes" className="flex-1">
              <TabsList className="grid w-full grid-cols-3 m-4">
                <TabsTrigger value="notes" className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="mindmap" className="flex items-center">
                  <Map className="w-4 h-4 mr-1" />
                  Mind Map
                </TabsTrigger>
                <TabsTrigger value="qa" className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Q&A
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 p-4 overflow-y-auto">
                <TabsContent value="notes" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Auto-Generated Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {video.aiFeatures?.hasAutoNotes ? (
                        <>
                          <div>
                            <h4 className="font-medium mb-2">Key Concepts</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                              <li>Introduction to rotational motion</li>
                              <li>Angular velocity and acceleration</li>
                              <li>Moment of inertia calculations</li>
                              <li>Conservation of angular momentum</li>
                            </ul>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h4 className="font-medium mb-2">Important Formulas</h4>
                            <div className="space-y-2 text-sm">
                              <div className="p-2 bg-gray-100 rounded">
                                <code>ω = θ/t</code>
                                <p className="text-xs text-gray-600 mt-1">Angular velocity</p>
                              </div>
                              <div className="p-2 bg-gray-100 rounded">
                                <code>I = Σmr²</code>
                                <p className="text-xs text-gray-600 mt-1">Moment of inertia</p>
                              </div>
                            </div>
                          </div>

                          <Button className="w-full" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Download Notes
                          </Button>
                        </>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          Auto-generated notes not available for this video.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="mindmap" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Map className="w-5 h-5 mr-2" />
                        Visual Mind Map
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {video.aiFeatures?.hasVisualMaps ? (
                        <div className="space-y-4">
                          <div className="aspect-square bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                            <div className="text-center">
                              <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">Interactive mind map</p>
                              <p className="text-xs text-gray-500">Visual concept relationships</p>
                            </div>
                          </div>
                          <Button className="w-full" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Download Mind Map
                          </Button>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          Visual mind map not available for this video.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="qa" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Voice-Enabled Q&A
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {video.aiFeatures?.hasVoiceQA ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">Ask Questions</h4>
                            <p className="text-sm text-blue-700">
                              Use the microphone to ask questions about this lecture, 
                              or type your questions below.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm">Common Questions:</h5>
                            <div className="space-y-1">
                              <Button variant="ghost" size="sm" className="justify-start h-auto p-2 text-left">
                                <span className="text-xs">What is the difference between linear and angular motion?</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="justify-start h-auto p-2 text-left">
                                <span className="text-xs">How do you calculate moment of inertia for different shapes?</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="justify-start h-auto p-2 text-left">
                                <span className="text-xs">When is angular momentum conserved?</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          Voice Q&A not available for this video.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
