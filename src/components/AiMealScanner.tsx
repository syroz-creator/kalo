import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Utensils,
  Check,
  RefreshCw,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { MealAnalysisResult, MealType } from '../types';

interface AiMealScannerProps {
  targetMeal: MealType;
  initialImage?: string | null;
  onChangeTargetMeal?: (meal: MealType) => void;
  onLogMealResult: (result: {
    meal: MealType;
    dishName: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    portionDescription: string;
    imageUrl?: string;
  }) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const MEAL_OPTIONS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snacks', label: 'Snacks' },
];

export const AiMealScanner: React.FC<AiMealScannerProps> = ({
  targetMeal,
  initialImage = null,
  onChangeTargetMeal,
  onLogMealResult,
  onClose,
  isModal = false,
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealType>(targetMeal);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImage);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');

  // Live camera stream
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // AI loading and result states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Scanning image with Kalo AI...');
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable fields in result
  const [editCalories, setEditCalories] = useState<string>('');
  const [editProtein, setEditProtein] = useState<string>('');
  const [editCarbs, setEditCarbs] = useState<string>('');
  const [editFat, setEditFat] = useState<string>('');
  const [editDishName, setEditDishName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedMeal(targetMeal);
  }, [targetMeal]);

  // If provided an initial image from direct snap, analyze it immediately!
  useEffect(() => {
    if (initialImage) {
      setImagePreview(initialImage);
      runAiAnalysis(initialImage, 'image/jpeg');
    } else {
      // Straight to camera!
      startCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [initialImage]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCameraStream = async () => {
    setErrorMessage(null);
    try {
      stopCameraStream();
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch {
      // If live video permission blocked or not supported, trigger native camera input directly
      cameraInputRef.current?.click();
    }
  };

  const takeSnapshotAndAnalyze = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setImagePreview(dataUrl);
      setImageMime('image/jpeg');
      stopCameraStream();
      setAnalysisResult(null);

      // Instantly run analysis! No extra clicks needed
      runAiAnalysis(dataUrl, 'image/jpeg');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type || 'image/jpeg';
    setImageMime(mime);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      setAnalysisResult(null);
      setErrorMessage(null);
      stopCameraStream();
      // Instantly run analysis!
      runAiAnalysis(dataUrl, mime);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const runAiAnalysis = async (imgData: string, mime: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisStep('Scanning plate & detecting scale...');

    const stepTimer1 = setTimeout(() => {
      setAnalysisStep('Calibrating portion size with utensil reference...');
    }, 1100);

    const stepTimer2 = setTimeout(() => {
      setAnalysisStep('Calculating calories & macronutrients...');
    }, 2400);

    try {
      const response = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imgData,
          mimeType: mime,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze meal image');
      }

      const res: MealAnalysisResult = data.data;
      setAnalysisResult(res);
      setEditDishName(res.dishName || 'Scanned Meal');
      setEditCalories(String(res.totalCalories || 0));
      setEditProtein(String(res.totalProtein || 0));
      setEditCarbs(String(res.totalCarbs || 0));
      setEditFat(String(res.totalFat || 0));
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error)?.message || 'Could not analyze photo. Please try again with clear lighting.'
      );
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
    }
  };

  const handleConfirmLog = () => {
    if (!analysisResult) return;

    const cal = Number(editCalories) || analysisResult.totalCalories;
    const prot = Number(editProtein) || analysisResult.totalProtein;
    const carb = Number(editCarbs) || analysisResult.totalCarbs;
    const fatVal = Number(editFat) || analysisResult.totalFat;
    const name = editDishName.trim() || analysisResult.dishName || 'AI Scanned Meal';

    const portionsList = analysisResult.items?.map((i) => `${i.name} (${i.portion})`).join(', ');

    onLogMealResult({
      meal: selectedMeal,
      dishName: name,
      totalCalories: Math.round(cal),
      totalProtein: Math.round(prot * 10) / 10,
      totalCarbs: Math.round(carb * 10) / 10,
      totalFat: Math.round(fatVal * 10) / 10,
      portionDescription: portionsList || '1 plate',
      imageUrl: imagePreview || undefined,
    });

    if (onClose) {
      onClose();
    }
  };

  const handleRetake = () => {
    setImagePreview(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    startCameraStream();
  };

  return (
    <div className={`flex flex-col flex-1 overflow-y-auto no-scrollbar text-white ${isModal ? 'p-4' : 'px-4 py-3 space-y-4'}`}>
      {/* Hidden native camera/file inputs for instant access */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />

      {/* Target Meal Selector Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex-1">
          {MEAL_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                setSelectedMeal(opt.type);
                onChangeTargetMeal?.(opt.type);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedMeal === opt.type
                  ? 'bg-yellow-400 text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Viewfinder or Image Preview Area */}
      <div className="bg-[#18181B] rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl relative min-h-[300px] flex flex-col items-center justify-center">
        {/* Live Camera Viewfinder */}
        {isCameraActive && !imagePreview ? (
          <div className="relative w-full h-[360px] bg-black flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

            {/* Glowing Target Alignment Grid */}
            <div className="absolute inset-6 border-2 border-dashed border-yellow-400/80 rounded-3xl pointer-events-none flex flex-col items-center justify-between p-3">
              <span className="text-[10px] font-black text-black bg-yellow-400 px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <Utensils className="w-3 h-3" />
                <span>Place fork next to food for millimeter scale</span>
              </span>

              {/* Center Crosshair */}
              <div className="w-8 h-8 rounded-full border border-yellow-400/50 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400" />
              </div>

              <span className="text-[10px] text-zinc-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md font-medium">
                Tap button below to snap & count
              </span>
            </div>

            {/* Shutter Button Overlay */}
            <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-zinc-700 hover:bg-black transition-colors"
                title="System Camera"
              >
                <Upload className="w-4 h-4 text-yellow-400" />
              </button>

              {/* Big Pulsing Shutter Button */}
              <button
                type="button"
                onClick={takeSnapshotAndAnalyze}
                className="w-20 h-20 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black border-4 border-black shadow-2xl shadow-yellow-400/50 flex items-center justify-center active:scale-95 transition-all relative group"
                aria-label="Take photo and count calories"
              >
                <div className="absolute -inset-1 rounded-full border-2 border-yellow-400/60 animate-ping pointer-events-none" />
                <Camera className="w-9 h-9 text-black stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-zinc-700 hover:bg-black transition-colors"
                title="Choose from library"
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ) : imagePreview ? (
          /* Captured Image Preview with Animated Laser Scanner */
          <div className="relative w-full">
            <img src={imagePreview} alt="Meal preview" className="w-full h-[320px] object-cover" />

            {/* Animated Laser Scanning Beam */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-yellow-400/10 pointer-events-none overflow-hidden">
                <div className="absolute left-0 right-0 h-1 bg-yellow-400 shadow-[0_0_20px_#facc15] animate-laser-scan" />
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/20 via-transparent to-yellow-400/20 pointer-events-none" />
              </div>
            )}

            {/* Retake button */}
            {!isAnalyzing && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-black hover:bg-black transition-colors flex items-center gap-1.5 border border-zinc-700 shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Retake</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Fallback Direct Trigger Screen */
          <div className="p-8 text-center space-y-4 w-full">
            <div className="w-16 h-16 rounded-3xl bg-yellow-400 text-black mx-auto flex items-center justify-center shadow-lg shadow-yellow-400/30 animate-pop-bounce">
              <Camera className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Opening Camera...</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-[240px] mx-auto">
                Snap your meal with a fork next to it for millimeter portion calculation
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-5 py-3 bg-yellow-400 text-black font-black text-xs rounded-2xl flex items-center gap-2 shadow-md hover:bg-yellow-300"
              >
                <Camera className="w-4 h-4" />
                <span>Open Device Camera</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-2xl flex items-center gap-2 border border-zinc-700 hover:text-white"
              >
                <Upload className="w-4 h-4 text-yellow-400" />
                <span>Photo Library</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analyzing Banner */}
      {isAnalyzing && (
        <div className="bg-[#18181B] rounded-2xl border border-yellow-400/40 p-4 flex items-center gap-3 shadow-lg animate-pop-bounce">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-400 flex-shrink-0" />
          <div>
            <span className="text-xs font-black text-yellow-400 uppercase tracking-wider block">
              Kalo AI Vision Active
            </span>
            <span className="text-xs font-bold text-white mt-0.5 block">{analysisStep}</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl flex items-start gap-3 text-red-200 text-xs shadow-lg animate-pop-bounce">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div className="space-y-1">
            <span className="font-black text-white block">Could not analyze photo</span>
            <span className="text-red-300 block leading-relaxed">{errorMessage}</span>
            <button
              type="button"
              onClick={handleRetake}
              className="mt-2 text-xs font-bold text-yellow-400 underline underline-offset-2"
            >
              Try another photo
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Result Display */}
      {analysisResult && (
        <div className="bg-[#18181B] rounded-3xl border-2 border-yellow-400/60 p-5 shadow-2xl space-y-4 animate-pop-bounce">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-wider bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                Verified with Vision AI
              </span>
              <h3 className="text-lg font-black text-white mt-1 leading-tight">
                {analysisResult.dishName}
              </h3>
            </div>

            <div className="text-right">
              <span className="text-3xl font-black text-yellow-400 leading-none block">
                {analysisResult.totalCalories}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                kcal
              </span>
            </div>
          </div>

          {/* Scale Detection Info Badge */}
          {analysisResult.referenceObjectDetected && (
            <div className="bg-[#202024] p-2.5 rounded-2xl border border-zinc-800 flex items-start gap-2 text-[11px] text-zinc-300">
              <Utensils className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Scale Calibration:</span>
                <span className="text-zinc-400 leading-snug">
                  {analysisResult.referenceObjectDetected}
                </span>
              </div>
            </div>
          )}

          {/* Macronutrients Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-2xl bg-[#202024] border border-zinc-800 text-center">
              <span className="text-[10px] text-zinc-400 font-bold block uppercase">Protein</span>
              <span className="text-sm font-black text-white mt-0.5 block">
                {analysisResult.totalProtein}g
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#202024] border border-zinc-800 text-center">
              <span className="text-[10px] text-zinc-400 font-bold block uppercase">Carbs</span>
              <span className="text-sm font-black text-white mt-0.5 block">
                {analysisResult.totalCarbs}g
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#202024] border border-zinc-800 text-center">
              <span className="text-[10px] text-zinc-400 font-bold block uppercase">Fat</span>
              <span className="text-sm font-black text-white mt-0.5 block">
                {analysisResult.totalFat}g
              </span>
            </div>
          </div>

          {/* Identified ingredients list */}
          {analysisResult.items && analysisResult.items.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Detected Items
              </span>
              <div className="space-y-1">
                {analysisResult.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    <span>
                      {item.name} <span className="text-zinc-500 font-normal">({item.portion})</span>
                    </span>
                    <span className="font-black text-yellow-400">{item.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm & Log Button */}
          <button
            type="button"
            onClick={handleConfirmLog}
            className="w-full h-13 bg-yellow-400 hover:bg-yellow-300 active:scale-[0.99] text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/25 mt-2"
          >
            <Check className="w-5 h-5 stroke-[3] text-black" />
            <span>
              Log {analysisResult.totalCalories} kcal to {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
