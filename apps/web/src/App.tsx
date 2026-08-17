import {
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Eye,
  Layers3,
  Link2,
  Maximize2,
  MessageSquareText,
  Minus,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from 'react';

type InspectorTab = 'style' | 'code';
type WorkspaceMode = 'inspect' | 'code';

type Frame = {
  id: string;
  name: string;
  caption: string;
  tone: string;
  uploaded?: boolean;
  selection: {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    fill: string;
  };
};

const layers = [
  'Canvas / Web 1440',
  'Header',
  'Hero / Dashboard',
  'Section / Recent',
  'Card / Featured',
];

const clampZoom = (value: number) => Math.min(1.35, Math.max(0.38, value));

const prototypeTargets: Frame['selection'][] = [
  {
    name: 'Hero / Dashboard',
    x: 0,
    y: 58,
    width: 1024,
    height: 310,
    radius: 0,
    fill: '#1749E7',
  },
  {
    name: 'Card / Seamless Campaign',
    x: 87,
    y: 438,
    width: 244,
    height: 178,
    radius: 14,
    fill: '#232C4A',
  },
  {
    name: 'Card / Echo System',
    x: 347,
    y: 438,
    width: 244,
    height: 178,
    radius: 14,
    fill: '#D69977',
  },
  {
    name: 'Metric / Collaboration',
    x: 607,
    y: 438,
    width: 281,
    height: 178,
    radius: 14,
    fill: '#F2F4F8',
  },
];

const nodeChildren: Record<string, string[]> = {
  'Canvas / Root': prototypeTargets.map((target) => target.name),
  'Hero / Dashboard': [
    'Hero / Copy',
    'Text / BUILD WITH CLARITY',
    'Text / 主标题',
    'Group / 操作按钮',
    'Decoration / Orb',
  ],
  'Card / Seamless Campaign': [
    'Text / 01',
    'Text / Seamless Campaign',
    'Decoration / Shape — Campaign',
  ],
  'Card / Echo System': [
    'Text / 02',
    'Text / Echo System',
    'Decoration / Shape — Echo',
  ],
  'Metric / Collaboration': [
    'Text / 本周协作',
    'Text / 12+',
    'Text / 比上周增加 24%',
    'Chart / Metric bars',
  ],
};

const nodeSelectionByName: Record<string, Frame['selection']> = {
  'Hero / Dashboard': prototypeTargets[0]!,
  'Card / Seamless Campaign': prototypeTargets[1]!,
  'Card / Echo System': prototypeTargets[2]!,
  'Metric / Collaboration': prototypeTargets[3]!,
  'Hero / Copy': {
    name: 'Hero / Copy',
    x: 87,
    y: 116,
    width: 392,
    height: 208,
    radius: 0,
    fill: 'transparent',
  },
  'Text / BUILD WITH CLARITY': {
    name: 'Text / BUILD WITH CLARITY',
    x: 87,
    y: 116,
    width: 128,
    height: 16,
    radius: 0,
    fill: 'transparent',
  },
  'Text / 主标题': {
    name: 'Text / 主标题',
    x: 87,
    y: 145,
    width: 315,
    height: 90,
    radius: 0,
    fill: 'transparent',
  },
  'Group / 操作按钮': {
    name: 'Group / 操作按钮',
    x: 87,
    y: 273,
    width: 198,
    height: 38,
    radius: 8,
    fill: 'transparent',
  },
  'Decoration / Orb': {
    name: 'Decoration / Orb',
    x: 689,
    y: 93,
    width: 218,
    height: 218,
    radius: 109,
    fill: '#6885FF',
  },
  'Text / 01': {
    name: 'Text / 01',
    x: 106,
    y: 457,
    width: 28,
    height: 15,
    radius: 0,
    fill: 'transparent',
  },
  'Text / Seamless Campaign': {
    name: 'Text / Seamless Campaign',
    x: 106,
    y: 526,
    width: 132,
    height: 45,
    radius: 0,
    fill: 'transparent',
  },
  'Text / 02': {
    name: 'Text / 02',
    x: 366,
    y: 457,
    width: 28,
    height: 15,
    radius: 0,
    fill: 'transparent',
  },
  'Text / Echo System': {
    name: 'Text / Echo System',
    x: 366,
    y: 526,
    width: 115,
    height: 45,
    radius: 0,
    fill: 'transparent',
  },
  'Decoration / Shape — Campaign': {
    name: 'Decoration / Shape — Campaign',
    x: 229,
    y: 497,
    width: 88,
    height: 88,
    radius: 42,
    fill: 'transparent',
  },
  'Decoration / Shape — Echo': {
    name: 'Decoration / Shape — Echo',
    x: 489,
    y: 497,
    width: 88,
    height: 88,
    radius: 42,
    fill: 'transparent',
  },
  'Text / 本周协作': {
    name: 'Text / 本周协作',
    x: 626,
    y: 457,
    width: 72,
    height: 15,
    radius: 0,
    fill: 'transparent',
  },
  'Text / 12+': {
    name: 'Text / 12+',
    x: 626,
    y: 482,
    width: 74,
    height: 43,
    radius: 0,
    fill: 'transparent',
  },
  'Text / 比上周增加 24%': {
    name: 'Text / 比上周增加 24%',
    x: 626,
    y: 532,
    width: 84,
    height: 15,
    radius: 0,
    fill: 'transparent',
  },
  'Chart / Metric bars': {
    name: 'Chart / Metric bars',
    x: 808,
    y: 556,
    width: 61,
    height: 39,
    radius: 0,
    fill: 'transparent',
  },
};

const supportedFileTypes = '.sketch,.fig,.psd,.xd';

function createUploadedFrame(file: File, index: number): Frame {
  const extension = file.name.includes('.')
    ? file.name.split('.').pop()!.toUpperCase()
    : '文件';
  const name = file.name.replace(/\.[^.]+$/, '') || '未命名设计';
  const hue =
    Array.from(file.name).reduce(
      (value, character) => value + character.charCodeAt(0),
      0,
    ) % 360;

  return {
    id: `upload-${Date.now()}-${index}`,
    name,
    caption: `已上传 · ${extension}`,
    tone: `hsl(${hue} 50% 62%)`,
    uploaded: true,
    selection: {
      name: 'Canvas / Root',
      x: 72,
      y: 106,
      width: 880,
      height: 516,
      radius: 16,
      fill: '#FFFFFF',
    },
  };
}

export function App() {
  const [frameList, setFrameList] = useState<Frame[]>([]);
  const [activeId, setActiveId] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<Frame['selection']>();
  const [selectedTreeRoot, setSelectedTreeRoot] =
    useState<Frame['selection']>();
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<WorkspaceMode>('inspect');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('style');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<
    | {
        pointerId: number;
        x: number;
        y: number;
        panX: number;
        panY: number;
      }
    | undefined
  >(undefined);

  const activeFrame = useMemo(
    () => frameList.find((frame) => frame.id === activeId),
    [activeId, frameList],
  );
  const selection = selectedLayer ?? activeFrame?.selection;
  const treeRoot = selectedTreeRoot ?? activeFrame?.selection;
  const selectionStyle = selection && {
    left: selection.x,
    top: selection.y,
    width: selection.width,
    height: selection.height,
    borderRadius: selection.radius,
  };

  const adjustZoom = (amount: number) =>
    setZoom((current) => clampZoom(current + amount));

  const onWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((current) => clampZoom(current - event.deltaY * 0.001));
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setPan({
      x: current.panX + event.clientX - current.x,
      y: current.panY + event.clientY - current.y,
    });
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = undefined;
  };

  const copyCode = async () => {
    if (!activeFrame || !selection) return;
    try {
      await navigator.clipboard.writeText(
        componentCode(activeFrame, selection),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const uploadDesigns = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const uploadedFrames = selectedFiles.map(createUploadedFrame);
    setFrameList((current) => [...uploadedFrames, ...current]);
    setActiveId(uploadedFrames[0]!.id);
    setSelectedLayer(undefined);
    setSelectedTreeRoot(undefined);
    setUploadNotice(
      selectedFiles.length === 1
        ? `“${selectedFiles[0]!.name}” 已加入全部设计`
        : `${selectedFiles.length} 个文件已加入全部设计`,
    );
    event.target.value = '';
  };

  const removeUploadedFrame = (frame: Frame) => {
    const remainingFrames = frameList.filter((item) => item.id !== frame.id);
    setFrameList(remainingFrames);
    if (activeId === frame.id) setActiveId(remainingFrames[0]?.id ?? '');
    setSelectedLayer(undefined);
    setSelectedTreeRoot(undefined);
    setUploadNotice(`“${frame.name}” 已从全部设计中移除`);
  };

  const selectFrame = (frame: Frame) => {
    setActiveId(frame.id);
    setSelectedLayer(undefined);
    setSelectedTreeRoot(undefined);
  };

  const selectPrototypeLayer = (layer: Frame['selection']) => {
    setSelectedLayer(layer);
    setSelectedTreeRoot(layer);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '0') {
        setZoom(0.72);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!uploadNotice) return;
    const timer = window.setTimeout(() => setUploadNotice(undefined), 2600);
    return () => window.clearTimeout(timer);
  }, [uploadNotice]);

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="project-lockup">
          <button className="icon-button" aria-label="关闭项目">
            <X size={22} />
          </button>
          <span className="project-name">AURORA / Web</span>
          <span className="save-state">
            <span />
            已保存
          </span>
        </div>

        <nav className="workspace-tabs" aria-label="工作模式">
          <button
            className={mode === 'inspect' ? 'active' : ''}
            onClick={() => setMode('inspect')}
          >
            标注
          </button>
          <button
            className={mode === 'code' ? 'active' : ''}
            onClick={() => setMode('code')}
          >
            代码
          </button>
        </nav>

        <div className="toolbar-actions">
          <button className="icon-button" aria-label="历史版本">
            <Clock3 size={20} />
          </button>
          <span className="toolbar-divider" />
          <button className="icon-button" aria-label="评论">
            <MessageSquareText size={20} />
          </button>
          <button className="icon-button" aria-label="查看">
            <Eye size={20} />
          </button>
          <button className="icon-button" aria-label="标注">
            <PenLine size={20} />
          </button>
          <button className="icon-button" aria-label="连接">
            <Link2 size={20} />
          </button>
          <span className="toolbar-divider" />
          <div className="zoom-control" aria-label="画布缩放">
            <button aria-label="缩小" onClick={() => adjustZoom(-0.08)}>
              <Minus size={19} />
            </button>
            <button
              className="zoom-value"
              onClick={() => {
                setZoom(0.72);
                setPan({ x: 0, y: 0 });
              }}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button aria-label="放大" onClick={() => adjustZoom(0.08)}>
              <Plus size={19} />
            </button>
          </div>
          <button className="icon-button" aria-label="更多操作">
            <MoreHorizontal size={22} />
          </button>
          <button className="share-button">
            <Send size={16} />
            分享
          </button>
        </div>
      </header>

      <section className="workspace-body">
        <aside className="frames-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">画板</span>
              <h1>全部设计</h1>
            </div>
            <button className="icon-button" aria-label="搜索画板">
              <Search size={20} />
            </button>
          </div>
          <div className="frame-count">{frameList.length} 个画板 · Web 端</div>
          <input
            ref={fileInput}
            className="file-input"
            type="file"
            multiple
            accept={supportedFileTypes}
            onChange={uploadDesigns}
          />
          <button
            className="upload-design-button"
            onClick={() => fileInput.current?.click()}
          >
            <UploadCloud size={16} />
            上传设计文件
          </button>
          <p className="upload-supported">支持 Sketch、Figma、PSD 与 XD</p>
          <div className="frame-list">
            {frameList.length === 0 && (
              <div className="empty-frame-list">
                <Layers3 size={19} />
                <strong>还没有设计文件</strong>
                <span>上传后会在这里生成可选画板</span>
              </div>
            )}
            {frameList.map((frame, index) => (
              <div
                className={`frame-item ${frame.id === activeId ? 'selected' : ''}`}
                key={frame.id}
              >
                <button
                  className="frame-select-button"
                  onClick={() => selectFrame(frame)}
                >
                  <FrameThumbnail tone={frame.tone} index={index} />
                  <span className="frame-text">
                    <strong>{frame.name}</strong>
                    <small>
                      {frame.caption}
                      {frame.uploaded ? '' : ' · 1440 × 1024'}
                    </small>
                  </span>
                  {frame.id === activeId && !frame.uploaded && (
                    <ChevronRight className="frame-arrow" size={16} />
                  )}
                </button>
                {frame.uploaded && (
                  <button
                    className="delete-upload-button"
                    aria-label={`删除 ${frame.name}`}
                    onClick={() => removeUploadedFrame(frame)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="source-badge">
            <Sparkles size={15} />
            已上传的设计会保留在本次工作区
          </div>
          {uploadNotice && (
            <div className="upload-notice">
              <Check size={15} />
              {uploadNotice}
            </div>
          )}
        </aside>

        {activeFrame && selection && selectionStyle ? (
          <>
            <section
              className="canvas-stage"
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
            >
              <div className="canvas-hint">
                <MousePointer2 size={14} />
                点击图层选中 · 拖动平移 · ⌘ 滚动缩放
              </div>
              <div
                className="artboard-wrap"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                <div className="artboard-meta">
                  <span>{activeFrame.name}</span>
                  <i />
                  版本 1.0
                </div>
                <PrototypeArtboard
                  frame={activeFrame}
                  mode={mode}
                  selection={selection}
                  selectionStyle={selectionStyle}
                  onSelectLayer={selectPrototypeLayer}
                />
                <div className="dimension width">1440 px</div>
                <div className="dimension height">1024 px</div>
              </div>
              <button
                className="reset-view"
                onClick={() => {
                  setZoom(0.72);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <Maximize2 size={15} />
                适应画布
              </button>
            </section>

            {drawerOpen ? (
              <Inspector
                activeFrame={activeFrame}
                selection={selection}
                treeRoot={treeRoot ?? selection}
                onSelectLayer={setSelectedLayer}
                tab={inspectorTab}
                setTab={setInspectorTab}
                copyCode={copyCode}
                copied={copied}
                close={() => setDrawerOpen(false)}
              />
            ) : (
              <CollapsedDrawer open={() => setDrawerOpen(true)} />
            )}
          </>
        ) : (
          <>
            <section className="empty-canvas">
              <div className="empty-canvas-mark">
                <UploadCloud size={27} />
              </div>
              <p>开始一个设计交付</p>
              <span>
                上传 Sketch、Figma、PSD 或 XD 文件后，即可在这里查看原型与样式。
              </span>
              <button onClick={() => fileInput.current?.click()}>
                <UploadCloud size={16} />
                上传设计文件
              </button>
            </section>
            {drawerOpen ? (
              <EmptyInspector close={() => setDrawerOpen(false)} />
            ) : (
              <CollapsedDrawer open={() => setDrawerOpen(true)} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function FrameThumbnail({ tone, index }: { tone: string; index: number }) {
  return (
    <span
      className="frame-thumbnail"
      style={{ '--thumb-tone': tone } as React.CSSProperties}
    >
      <i className="thumb-top" />
      <i className="thumb-hero" />
      <i className="thumb-card one" />
      <i className="thumb-card two" />
      {index % 2 === 0 && <i className="thumb-dot" />}
    </span>
  );
}

function PrototypeArtboard({
  frame,
  mode,
  selection,
  selectionStyle,
  onSelectLayer,
}: {
  frame: Frame;
  mode: WorkspaceMode;
  selection: Frame['selection'];
  selectionStyle: React.CSSProperties;
  onSelectLayer: (layer: Frame['selection']) => void;
}) {
  return (
    <article className="prototype-artboard" aria-label={`${frame.name} 原型图`}>
      <div className="prototype-topline">
        <span className="prototype-brand">
          <i />
          aurora
        </span>
        <span>产品</span>
        <span>案例</span>
        <span>资源</span>
        <span>关于我们</span>
        <button>
          开始使用 <ChevronRight size={13} />
        </button>
      </div>
      <section className="prototype-hero">
        <div className="hero-copy">
          <p>BUILD WITH CLARITY</p>
          <h2>
            让每一次创意，
            <br />
            都有落地的形状。
          </h2>
          <span>
            设计协作、资产管理与开发交付，全部在同一个清晰的工作流里完成。
          </span>
          <div>
            <button>
              创建新画布 <Plus size={15} />
            </button>
            <button className="ghost">查看项目</button>
          </div>
        </div>
        <div className="hero-orb">
          <i />
          <b />
          <em />
        </div>
      </section>
      <section className="prototype-content">
        <div className="content-heading">
          <div>
            <p>RECENT WORK</p>
            <h3>最近的设计</h3>
          </div>
          <button>
            查看全部 <ChevronRight size={14} />
          </button>
        </div>
        <div className="dashboard-grid">
          <div className="project-card dark">
            <span>01</span>
            <b>
              Seamless
              <br />
              Campaign
            </b>
            <i />
          </div>
          <div className="project-card light">
            <span>02</span>
            <b>
              Echo
              <br />
              System
            </b>
            <i />
          </div>
          <div className="metric-card">
            <p>本周协作</p>
            <strong>
              12<span>+</span>
            </strong>
            <small>比上周增加 24%</small>
            <div className="metric-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>
      {mode === 'inspect' ? (
        <>
          {prototypeTargets.map((target) => (
            <button
              aria-label={`选中 ${target.name}`}
              className="prototype-hit-area"
              key={target.name}
              style={{
                left: target.x,
                top: target.y,
                width: target.width,
                height: target.height,
                borderRadius: target.radius,
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onSelectLayer(target)}
            />
          ))}
          <div className="selection-outline" style={selectionStyle}>
            <span className="selection-tag">{selection.name}</span>
            <i className="corner one" />
            <i className="corner two" />
            <i className="corner three" />
            <i className="corner four" />
          </div>
        </>
      ) : (
        <div className="code-surface">
          <Code2 size={15} />
          <span>&lt;Hero variant=&quot;dashboard&quot; /&gt;</span>
        </div>
      )}
    </article>
  );
}

function CollapsedDrawer({ open }: { open: () => void }) {
  return (
    <button className="open-drawer" onClick={open} aria-label="打开检查器">
      <PanelRightOpen size={19} />
    </button>
  );
}

function EmptyInspector({ close }: { close: () => void }) {
  return (
    <aside className="inspector-panel empty-inspector">
      <div className="inspector-device">
        <Monitor size={20} />
        <strong>等待设计文件</strong>
        <ChevronDown size={17} />
      </div>
      <div className="empty-inspector-content">
        <div>
          <Layers3 size={23} />
        </div>
        <strong>暂无图层信息</strong>
        <span>上传并选择一个设计文件后，样式和代码会显示在这里。</span>
      </div>
      <div className="inspector-footer">
        <button className="compact-empty-close" onClick={close}>
          <PanelRightClose size={18} />
          收起检查器
        </button>
      </div>
    </aside>
  );
}

function Inspector({
  activeFrame,
  selection,
  treeRoot,
  onSelectLayer,
  tab,
  setTab,
  copyCode,
  copied,
  close,
}: {
  activeFrame: Frame;
  selection: Frame['selection'];
  treeRoot: Frame['selection'];
  onSelectLayer: (layer: Frame['selection']) => void;
  tab: InspectorTab;
  setTab: (tab: InspectorTab) => void;
  copyCode: () => void;
  copied: boolean;
  close: () => void;
}) {
  const item = selection;
  return (
    <aside className="inspector-panel">
      <div className="inspector-device">
        <Monitor size={20} />
        <strong>Web</strong>
        <span>1440 × 1024 px</span>
        <ChevronDown size={17} />
      </div>
      <div className="inspector-tabs">
        <button
          className={tab === 'style' ? 'active' : ''}
          onClick={() => setTab('style')}
        >
          <Layers3 size={16} />
          样式信息
        </button>
        <button
          className={tab === 'code' ? 'active' : ''}
          onClick={() => setTab('code')}
        >
          <Braces size={16} />
          代码
        </button>
        <button
          className="compact-icon"
          aria-label="收起检查器"
          onClick={close}
        >
          <PanelRightClose size={18} />
        </button>
      </div>

      {tab === 'style' ? (
        <div className="inspector-scroll">
          <div className="selected-layer">
            <div className="layer-icon">
              <Layers3 size={17} />
            </div>
            <div>
              <span>当前图层</span>
              <strong>{item.name}</strong>
            </div>
            <MoreHorizontal size={18} />
          </div>
          <NodeTree
            selection={item}
            treeRoot={treeRoot}
            onSelectLayer={onSelectLayer}
          />
          <InspectorSection title="布局">
            <TwoValues
              label="位置"
              first={`${item.x}px`}
              second={`${item.y}px`}
              firstNote="X"
              secondNote="Y"
            />
            <TwoValues
              label="大小"
              first={`${item.width}px`}
              second={`${item.height}px`}
              firstNote="W"
              secondNote="H"
            />
            <SingleValue
              label="圆角"
              value={`${item.radius}px`}
              note="Corner radius"
            />
          </InspectorSection>
          <InspectorSection title="外观">
            <SingleValue
              label="填充"
              value={item.fill}
              note="Solid · 100%"
              swatch={item.fill}
            />
            <SingleValue label="不透明度" value="100%" note="Normal" />
          </InspectorSection>
          <InspectorSection title="效果">
            <TwoValues
              label="投影"
              first="0px / 8px"
              second="24px / 8%"
              firstNote="Offset"
              secondNote="Blur / Opacity"
            />
          </InspectorSection>
          <InspectorSection title="图层路径">
            <div className="layer-path">
              {layers.map((layer, index) => (
                <span key={layer}>
                  {index > 0 && <ChevronRight size={12} />}
                  {layer}
                </span>
              ))}
            </div>
          </InspectorSection>
        </div>
      ) : (
        <div className="code-inspector">
          <div className="code-language">
            <span>
              <i />
              HTML + CSS
            </span>
            <button onClick={copyCode}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre>
            <code>{componentCode(activeFrame, selection)}</code>
          </pre>
          <div className="code-note">
            <Sparkles size={15} />
            由结构化设计数据生成，可继续在代码编辑器中调整。
          </div>
        </div>
      )}
    </aside>
  );
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="inspector-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function NodeTree({
  selection,
  treeRoot,
  onSelectLayer,
}: {
  selection: Frame['selection'];
  treeRoot: Frame['selection'];
  onSelectLayer: (layer: Frame['selection']) => void;
}) {
  const children = nodeChildren[treeRoot.name] ?? [];
  return (
    <InspectorSection title="节点层级">
      <div className="node-tree" aria-label={`${treeRoot.name} 的节点层级`}>
        <button
          className={`node-tree-item root ${selection.name === treeRoot.name ? 'selected' : ''}`}
          onClick={() => onSelectLayer(treeRoot)}
        >
          <ChevronDown size={14} />
          <Layers3 size={14} />
          <strong>{treeRoot.name}</strong>
          <span>{selection.name === treeRoot.name ? '已选中' : '已展开'}</span>
        </button>
        {children.length > 0 ? (
          <div className="node-tree-children">
            {children.map((child) => (
              <button
                className={`node-tree-item ${selection.name === child ? 'selected' : ''}`}
                key={child}
                onClick={() => onSelectLayer(nodeSelectionByName[child]!)}
              >
                <i />
                <Layers3 size={13} />
                <span>{child}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="node-tree-empty">该节点无下级图层</div>
        )}
      </div>
    </InspectorSection>
  );
}

function TwoValues({
  label,
  first,
  second,
  firstNote,
  secondNote,
}: {
  label: string;
  first: string;
  second: string;
  firstNote: string;
  secondNote: string;
}) {
  return (
    <div className="property-row two-values">
      <span>{label}</span>
      <div>
        <b>{first}</b>
        <small>{firstNote}</small>
      </div>
      <div>
        <b>{second}</b>
        <small>{secondNote}</small>
      </div>
    </div>
  );
}

function SingleValue({
  label,
  value,
  note,
  swatch,
}: {
  label: string;
  value: string;
  note: string;
  swatch?: string;
}) {
  return (
    <div className="property-row single-value">
      <span>{label}</span>
      <div>
        {swatch && <i style={{ background: swatch }} />}
        <b>{value}</b>
        <small>{note}</small>
      </div>
    </div>
  );
}

function componentCode(frame: Frame, selection: Frame['selection']) {
  const className = `${frame.id}-${selection.name}`
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '');
  return `<!-- index.html -->\n<section class="${className}">\n  <h2>${frame.name}</h2>\n  <p>Build with clarity</p>\n</section>\n\n/* style.css */\n.${className} {\n  width: ${selection.width}px;\n  min-height: ${selection.height}px;\n  border-radius: ${selection.radius}px;\n  background: ${selection.fill};\n}`;
}
