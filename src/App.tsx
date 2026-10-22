import { useState } from 'react';
import { Mode, ArtworkMode, ArtworkAxis, MirrorAxis, Stroke } from './constants';
import { TraditionalPattern } from './patterns';
import { HomeScreen } from './screens/HomeScreen';
import { WorkshopScreen } from './screens/WorkshopScreen';
import { CardScreen } from './screens/CardScreen';
import { GalleryScreen } from './screens/GalleryScreen';
import { TogetherScreen } from './screens/TogetherScreen';
import { PatternScreen } from './screens/PatternScreen';

type Screen = 'home' | 'workshop' | 'card' | 'gallery' | 'together' | 'pattern';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<ArtworkMode>('mirror');
  const [axis, setAxis] = useState<ArtworkAxis>('vertical');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tracePattern, setTracePattern] = useState<TraditionalPattern | null>(null);

  // Start single mode (mirror / spin) from home or gallery
  const handleStartMode = (selectedMode: Mode) => {
    setMode(selectedMode);
    setAxis(selectedMode === 'spin' ? 'point' : 'vertical');
    setStrokes([]);
    setTracePattern(null);
    setScreen('workshop');
  };

  // Start together mode
  const handleStartTogether = () => {
    setMode('together');
    setAxis('none');
    setStrokes([]);
    setTracePattern(null);
    setScreen('together');
  };

  // Open Gallery
  const handleOpenGallery = () => {
    setScreen('gallery');
  };

  // Open Pattern Detective
  const handleOpenPattern = () => {
    setScreen('pattern');
  };

  // Trace pattern in Workshop (mirror or spin)
  const handleTracePattern = (
    pattern: TraditionalPattern,
    targetMode: Mode = 'mirror',
    targetAxis: MirrorAxis = 'vertical'
  ) => {
    setMode(targetMode);
    setAxis(targetMode === 'spin' ? 'point' : targetAxis);
    setStrokes([]);
    setTracePattern(pattern);
    setScreen('workshop');
  };

  // Workshop or Together finished -> Show Artwork Card
  const handleFinishedToCard = (
    finishedStrokes: Stroke[],
    finishedMode: ArtworkMode,
    finishedAxis: ArtworkAxis
  ) => {
    setStrokes(finishedStrokes);
    setMode(finishedMode);
    setAxis(finishedAxis);
    setScreen('card');
  };

  // Continue drawing from CardScreen
  const handleContinueDrawing = () => {
    if (mode === 'together') {
      setScreen('together');
    } else {
      setScreen('workshop');
    }
  };

  // Return to home
  const handleGoHome = () => {
    setScreen('home');
  };

  return (
    <main className="w-full h-full min-h-screen">
      {screen === 'home' && (
        <HomeScreen
          onStartMode={handleStartMode}
          onStartTogether={handleStartTogether}
          onOpenGallery={handleOpenGallery}
          onOpenPattern={handleOpenPattern}
        />
      )}

      {screen === 'workshop' && (
        <WorkshopScreen
          key={`${mode}-${strokes.length === 0 ? 'empty' : 'existing'}-${tracePattern ? tracePattern.id : 'notrace'}`}
          initialMode={mode === 'spin' ? 'spin' : 'mirror'}
          savedStrokes={strokes}
          savedAxis={axis === 'horizontal' || axis === 'both' ? (axis as MirrorAxis) : 'vertical'}
          tracePattern={tracePattern}
          onHome={handleGoHome}
          onFinish={handleFinishedToCard}
        />
      )}

      {screen === 'together' && (
        <TogetherScreen
          onHome={handleGoHome}
          onFinish={(togetherStrokes) => handleFinishedToCard(togetherStrokes, 'together', 'none')}
        />
      )}

      {screen === 'card' && (
        <CardScreen
          strokes={strokes}
          mode={mode}
          axis={axis}
          onContinueDrawing={handleContinueDrawing}
          onHome={handleGoHome}
        />
      )}

      {screen === 'gallery' && (
        <GalleryScreen
          onHome={handleGoHome}
          onStartMode={handleStartMode}
        />
      )}

      {screen === 'pattern' && (
        <PatternScreen
          onHome={handleGoHome}
          onTracePattern={handleTracePattern}
        />
      )}
    </main>
  );
}
