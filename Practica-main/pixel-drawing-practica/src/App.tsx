import { useState, useCallback, useEffect } from 'react';
import { Edit, Image as ImageIcon, Palette } from 'lucide-react';
import Canvas from './components/Canvas';
import ColorPalette from './components/ColorPalette';
import Toolbar from './components/Toolbar';
import Controls from './components/Controls';
import { CanvasState, Color, Tool, HistoryState, BrushShape } from './types';
import { createEmptyCanvas, defaultColor, exportCanvasAsPNG } from './utils';
import React from 'react';

function App() {
  const [canvasState, setCanvasState] = useState<CanvasState>(() => createEmptyCanvas(32, 32));
  const [currentColor, setCurrentColor] = useState<Color>(defaultColor);
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [pixelSize, setPixelSize] = useState(16);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [brushShape, setBrushShape] = useState<BrushShape>('circle');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [recentCustomColors, setRecentCustomColors] = useState<Color[]>(
    Array(8).fill({ r: 255, g: 255, b: 255, a: 1 })
  );
  const [activeTab, setActiveTab] = useState<'draw' | 'display' | 'help'>('draw');
  const [drawings, setDrawings] = useState<{ id: string; canvasState: CanvasState; createdAt?: string }[]>([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  const [drawingsError, setDrawingsError] = useState<string | null>(null);
  const [showBrushOptions, setShowBrushOptions] = useState(false);

  useEffect(() => {
    if (activeTab === 'display') {
      setLoadingDrawings(true);
      setDrawingsError(null);
      fetch('/api/drawings')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch drawings');
          return res.json();
        })
        .then(data => {
          // Map API response to expected shape
          type SupabaseDrawing = { id: string; data: CanvasState; created_at?: string };
          const mapped = Array.isArray(data)
            ? data.map((d: SupabaseDrawing) => ({
                id: d.id,
                canvasState: d.data, // Supabase column is 'data'
                createdAt: d.created_at,
              }))
            : [];
          setDrawings(mapped);
        })
        .catch(() => setDrawingsError('Failed to load drawings.'))
        .finally(() => setLoadingDrawings(false));
    }
  }, [activeTab]);

  // Fetch PatchNotes.md when Notes tab is activated on mobile
  useEffect(() => {
    if (activeTab === 'help' && !readmeContent) {
      fetch('/PatchNotes.md')
        .then(res => res.text())
        .then(text => setReadmeContent(text));
    }
  }, [activeTab, readmeContent]);

  // Set a larger pixelSize on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setPixelSize(28);
    }
  }, []);

  const pushRecentCustomColor = useCallback((color: Color) => {
    setRecentCustomColors(prev => {
      const colorEquals = (a: Color, b: Color) =>
        a.r === b.r && a.g === b.g && a.b === b.b && Math.abs(a.a - b.a) < 0.01;
      if (prev.some(c => colorEquals(c, color))) {
        return prev;
      }
      const next = [color, ...prev];
      return next.slice(0, 8);
    });
  }, []);

  const saveToHistory = useCallback((state: CanvasState) => {
    const newHistoryEntry: HistoryState = {
      canvasState: state,
      timestamp: Date.now()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHistoryEntry);
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex]);

  const handleCanvasChange = useCallback((newState: CanvasState) => {
    setCanvasState(newState);
    saveToHistory(newState);
  }, [saveToHistory]);

  const handleCanvasSizeChange = useCallback((width: number, height: number) => {
    if (width < 8 || width > 128 || height < 8 || height > 128) return;
    
    const newState = createEmptyCanvas(width, height);
    setCanvasState(newState);
    saveToHistory(newState);
  }, [saveToHistory]);

  const handleClearCanvas = useCallback(() => {
    const newState = createEmptyCanvas(canvasState.width, canvasState.height);
    setCanvasState(newState);
    saveToHistory(newState);
  }, [canvasState.width, canvasState.height, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCanvasState(history[newIndex].canvasState);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCanvasState(history[newIndex].canvasState);
    }
  }, [history, historyIndex]);

  const handleExport = useCallback(() => {
    exportCanvasAsPNG(canvasState);
  }, [canvasState]);

  const handleImportImage = useCallback(async (file: File) => {
    const MAX_SIZE = 128;
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    await new Promise((resolve) => { img.onload = resolve; });
    let width = img.width;
    let height = img.height;
    // Only scale down if needed
    if (width > MAX_SIZE || height > MAX_SIZE) {
      const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    } else {
      // If either dimension is still above MAX_SIZE (shouldn't happen, but just in case)
      width = Math.min(width, MAX_SIZE);
      height = Math.min(height, MAX_SIZE);
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const pixels = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        const a = imageData[idx + 3] / 255;
        row.push({ color: { r, g, b, a }, isEmpty: a === 0 });
      }
      pixels.push(row);
    }
    setCanvasState({ pixels, width, height });
    saveToHistory({ pixels, width, height });
    setHistoryIndex((prev) => prev + 1);
  }, [saveToHistory]);

  const handlePostDrawing = useCallback(async () => {
    try {
      const response = await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasState,
          createdAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to post drawing');
      alert('Drawing posted successfully!');
    } catch {
      alert('Error posting drawing.');
    }
  }, [canvasState]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header (desktop only) */}
      <div className="hidden md:flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pixel Art Studio</h1>
            <p className="text-sm text-gray-600">Create beautiful pixel art with precision</p>
          </div>
        </div>
        {/* Desktop Navigation */}
        <nav className="flex items-center space-x-4">
          <button
            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'draw' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => { setActiveTab('draw'); setShowHelp(false); }}
          >
            Draw
          </button>
          <button
            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'display' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => { setActiveTab('display'); setShowHelp(false); }}
          >
            Display Drawings
          </button>
          <button
            className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'help' || showHelp ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => { setActiveTab('help'); setShowHelp(true); }}
          >
            Notes
          </button>
        </nav>
      </div>
      {/* Swipeable Tools Bar (mobile only, only show on 'draw' tab) */}
      {activeTab === 'draw' && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-2 py-2 w-full">
          <div className="flex items-center overflow-x-auto space-x-2 scrollbar-hide">
            <Toolbar
              currentTool={currentTool}
              onToolChange={setCurrentTool}
              brushShape={brushShape}
              onBrushShapeChange={setBrushShape}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              horizontal
            />
            {currentTool === 'brush' && (
              <button
                onClick={() => setShowBrushOptions(true)}
                className="p-2 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 ml-2"
                title="Brush Options"
              >
                <span className="text-xs font-semibold">Brush</span>
              </button>
            )}
            <div className="flex items-center space-x-2 ml-2">
              <button onClick={handleUndo} disabled={!canUndo} className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"><span className="sr-only">Undo</span>↶</button>
              <button onClick={handleRedo} disabled={!canRedo} className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"><span className="sr-only">Redo</span>↷</button>
              <button onClick={handleExport} className="p-2 rounded bg-green-100 text-green-700 hover:bg-green-200"><span className="sr-only">Save</span>💾</button>
              <button onClick={handlePostDrawing} className="p-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"><span className="sr-only">Post</span>⬆️</button>
            </div>
          </div>
          <div className="overflow-x-auto flex space-x-2 mt-2 scrollbar-hide">
            <ColorPalette
              currentColor={currentColor}
              onColorChange={setCurrentColor}
              customColors={recentCustomColors}
              horizontal
              compact
            />
          </div>
          {/* Brush Options Modal (mobile only) */}
          {showBrushOptions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4 relative">
                <button
                  onClick={() => setShowBrushOptions(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                  title="Close"
                >
                  ×
                </button>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brush Shape</label>
                    <div className="flex space-x-2">
                      <button
                        className={`px-3 py-1 rounded-lg border ${brushShape === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setBrushShape('circle')}
                      >
                        Circle
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg border ${brushShape === 'square' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        onClick={() => setBrushShape('square')}
                      >
                        Square
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brush Size</label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={brushSize}
                      onChange={e => setBrushSize(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-600 mt-1">{brushSize} px</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Help Modal (mobile: show if activeTab === 'help', desktop: show if showHelp) */}
      {(showHelp || activeTab === 'help') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => { setShowHelp(false); setActiveTab('draw'); }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              title="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4">Notes</h2>
            <pre className="whitespace-pre-wrap text-sm text-gray-800 max-h-[60vh] overflow-y-auto">{readmeContent}</pre>
          </div>
        </div>
      )}
      {/* Controls (hide on display tab) */}
      {activeTab === 'draw' && (
        <Controls
          canvasWidth={canvasState.width}
          canvasHeight={canvasState.height}
          onCanvasSizeChange={handleCanvasSizeChange}
          onClearCanvas={handleClearCanvas}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={handleExport}
          pixelSize={pixelSize}
          onPixelSizeChange={setPixelSize}
          canUndo={canUndo}
          canRedo={canRedo}
          onImport={handleImportImage}
          onPostDrawing={handlePostDrawing}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {activeTab === 'draw' ? (
          <>
            {/* Sidebar (desktop only) */}
            <div className="hidden md:block w-64 bg-gray-50 md:border-r border-gray-200 p-4 overflow-y-auto mb-4 md:mb-0">
              <Toolbar
                currentTool={currentTool}
                onToolChange={setCurrentTool}
                brushShape={brushShape}
                onBrushShapeChange={setBrushShape}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
              />
              <ColorPalette
                currentColor={currentColor}
                onColorChange={setCurrentColor}
                customColors={recentCustomColors}
              />
              <div className="bg-white rounded-lg shadow-lg p-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Info</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Canvas: {canvasState.width} × {canvasState.height}</div>
                  <div>Tool: {currentTool}</div>
                  <div>Zoom: {pixelSize}px per pixel</div>
                  <div>History: {history.length} states</div>
                </div>
              </div>
            </div>
            {/* Canvas Area */}
            <div className="flex-1 flex items-center justify-center overflow-auto md:p-2 md:pb-0 md:pt-0 min-h-[60vh] md:min-h-0" style={{ height: 'calc(100vh - 84px - 56px)' }}>
              <div className="w-full flex justify-center" style={{ maxWidth: '100vw', maxHeight: '80vh' }}>
                <Canvas
                  canvasState={canvasState}
                  onCanvasChange={handleCanvasChange}
                  currentColor={currentColor}
                  currentTool={currentTool}
                  pixelSize={pixelSize}
                  onColorPick={setCurrentColor}
                  brushShape={brushShape}
                  brushSize={brushSize}
                  onCustomColorUsed={pushRecentCustomColor}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 p-8 overflow-y-auto">
            {loadingDrawings ? (
              <div className="text-gray-500 text-lg">Loading drawings...</div>
            ) : drawingsError ? (
              <div className="text-red-500 text-lg">{drawingsError}</div>
            ) : drawings.length === 0 ? (
              <div className="text-gray-500 text-lg">No drawings posted yet.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {drawings.map((drawing) => (
                  <div key={drawing.id} className="bg-white rounded-lg shadow p-2 flex flex-col items-center">
                    <DrawingThumbnail canvasState={drawing.canvasState} />
                    <div className="text-xs text-gray-400 mt-2">{drawing.createdAt ? new Date(drawing.createdAt).toLocaleString() : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Bottom Navigation Bar (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex justify-around py-2 w-full">
        <button
          className={`flex flex-col items-center flex-1 ${activeTab === 'draw' ? 'text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('draw')}
        >
          <Edit />
          <span className="text-xs mt-1">Draw</span>
        </button>
        <button
          className={`flex flex-col items-center flex-1 ${activeTab === 'display' ? 'text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('display')}
        >
          <ImageIcon />
          <span className="text-xs mt-1">Display</span>
        </button>
        <button
          className={`flex flex-col items-center flex-1 ${activeTab === 'help' ? 'text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('help')}
        >
          <span className="text-lg">?</span>
          <span className="text-xs mt-1">Notes</span>
        </button>
      </nav>
    </div>
  );
}

// DrawingThumbnail component for rendering a small canvas
function DrawingThumbnail({ canvasState }: { canvasState: CanvasState }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || !canvasState) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { pixels, width, height } = canvasState;
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = pixels[y][x];
        if (!pixel.isEmpty) {
          const { r, g, b, a } = pixel.color;
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }, [canvasState]);
  return <canvas ref={canvasRef} width={canvasState.width} height={canvasState.height} style={{ width: 64, height: 64, imageRendering: 'pixelated', border: '1px solid #eee', background: '#fff' }} />;
}

export default App;