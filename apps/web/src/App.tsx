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

const frames: Frame[] = [
  {
    id: 'overview',
    name: '项目概览',
    caption: 'Overview',
    tone: '#8799b6',
    selection: {
      name: 'Hero / Dashboard',
      x: 88,
      y: 156,
      width: 848,
      height: 212,
      radius: 24,
      fill: '#1B4EED',
    },
  },
  {
    id: 'explore',
    name: '灵感探索',
    caption: 'Explore',
    tone: '#d7a07c',
    selection: {
      name: 'Card / Featured',
      x: 588,
      y: 438,
      width: 348,
      height: 184,
      radius: 18,
      fill: '#FFFFFF',
    },
  },
  {
    id: 'library',
    name: '组件资源库',
    caption: 'Library',
    tone: '#9c8adc',
    selection: {
      name: 'Resource / Tile',
      x: 88,
      y: 438,
      width: 248,
      height: 184,
      radius: 18,
      fill: '#FFFFFF',
    },
  },
  {
    id: 'flow',
    name: '创建流程',
    caption: 'Flow',
    tone: '#78b8ad',
    selection: {
      name: 'Flow / Progress',
      x: 88,
      y: 406,
      width: 848,
      height: 6,
      radius: 3,
      fill: '#1B4EED',
    },
  },
  {
    id: 'settings',
    name: '工作区设置',
    caption: 'Settings',
    tone: '#c7a1ad',
    selection: {
      name: 'Panel / Settings',
      x: 588,
      y: 438,
      width: 348,
      height: 184,
      radius: 18,
      fill: '#FFFFFF',
    },
  },
  {
    id: 'handoff',
    name: '开发交付',
    caption: 'Handoff',
    tone: '#78a5d8',
    selection: {
      name: 'Button / Primary',
      x: 747,
      y: 289,
      width: 132,
      height: 42,
      radius: 12,
      fill: '#1B4EED',
    },
  },
];

const layers = [
  'Canvas / Web 1440',
  'Header',
  'Hero / Dashboard',
  'Section / Recent',
  'Card / Featured',
];

const clampZoom = (value: number) => Math.min(1.35, Math.max(0.38, value));

export function App() {
  const [activeId, setActiveId] = useState('overview');
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<WorkspaceMode>('inspect');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('style');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [copied, setCopied] = useState(false);
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
    () => frames.find((frame) => frame.id === activeId) ?? frames[0]!,
    [activeId],
  );
  const selection = activeFrame.selection;
  const selectionStyle = {
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
    try {
      await navigator.clipboard.writeText(componentCode(activeFrame));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
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
          <div className="frame-count">12 个画板 · Web 端</div>
          <div className="frame-list">
            {frames.map((frame, index) => (
              <button
                className={`frame-item ${frame.id === activeId ? 'selected' : ''}`}
                key={frame.id}
                onClick={() => setActiveId(frame.id)}
              >
                <FrameThumbnail tone={frame.tone} index={index} />
                <span className="frame-text">
                  <strong>{frame.name}</strong>
                  <small>{frame.caption} · 1440 × 1024</small>
                </span>
                {frame.id === activeId && (
                  <ChevronRight className="frame-arrow" size={16} />
                )}
              </button>
            ))}
          </div>
          <div className="source-badge">
            <Sparkles size={15} />
            已载入 Sketch 文件
          </div>
        </aside>

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
            拖动平移 · ⌘ 滚动缩放 · 0 重置
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
              selectionStyle={selectionStyle}
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
            tab={inspectorTab}
            setTab={setInspectorTab}
            copyCode={copyCode}
            copied={copied}
            close={() => setDrawerOpen(false)}
          />
        ) : (
          <button
            className="open-drawer"
            onClick={() => setDrawerOpen(true)}
            aria-label="打开检查器"
          >
            <PanelRightOpen size={19} />
          </button>
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
  selectionStyle,
}: {
  frame: Frame;
  mode: WorkspaceMode;
  selectionStyle: React.CSSProperties;
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
        <div className="selection-outline" style={selectionStyle}>
          <span className="selection-tag">{frame.selection.name}</span>
          <i className="corner one" />
          <i className="corner two" />
          <i className="corner three" />
          <i className="corner four" />
        </div>
      ) : (
        <div className="code-surface">
          <Code2 size={15} />
          <span>&lt;Hero variant=&quot;dashboard&quot; /&gt;</span>
        </div>
      )}
    </article>
  );
}

function Inspector({
  activeFrame,
  tab,
  setTab,
  copyCode,
  copied,
  close,
}: {
  activeFrame: Frame;
  tab: InspectorTab;
  setTab: (tab: InspectorTab) => void;
  copyCode: () => void;
  copied: boolean;
  close: () => void;
}) {
  const item = activeFrame.selection;
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
              React + CSS Modules
            </span>
            <button onClick={copyCode}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre>
            <code>{componentCode(activeFrame)}</code>
          </pre>
          <div className="code-note">
            <Sparkles size={15} />
            由结构化设计数据生成，可继续在代码编辑器中调整。
          </div>
        </div>
      )}

      <div className="inspector-footer">
        <button
          className="primary-code-button"
          onClick={() => {
            setTab('code');
          }}
        >
          <Code2 size={18} />
          查看代码
        </button>
        <button
          className="copy-code-button"
          aria-label="复制代码"
          onClick={copyCode}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
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

function componentCode(frame: Frame) {
  const name =
    frame.selection.name.replaceAll(/[^a-zA-Z0-9]+/g, '') || 'DesignBlock';
  return `export function ${name}() {\n  return (\n    <section className={styles.${frame.id}}>\n      <h2>${frame.name}</h2>\n      <span>Build with clarity</span>\n    </section>\n  );\n}\n\n.${frame.id} {\n  width: ${frame.selection.width}px;\n  min-height: ${frame.selection.height}px;\n  border-radius: ${frame.selection.radius}px;\n  background: ${frame.selection.fill};\n}`;
}
