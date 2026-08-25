import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Clock3,
  Copy,
  FilePlus2,
  FileText,
  House,
  ImagePlus,
  LayoutDashboard,
  MapPin,
  Menu,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import {
  CUSTOM_REPORT_TYPES,
  REPORT_TEMPLATES,
  STATUS_OPTIONS,
} from './inspection-data.js';
import './inspection-report.css';

const STORAGE_KEY = 'bodhi-quality-reports-v1';
const LEGACY_COPY = {
  '确认场地、临水临电、安全设施及成品保护条件，形成开工基线。': '确认场地、临水临电、安全设施及成品保护满足开工条件。',
  '以平整度、垂直度、空鼓、色差、安装精度和功能测试为主线。': '检查平整度、垂直度、空鼓、色差、安装精度和设备功能。',
  '汇总功能测试、清洁、缺陷整改和复验结论，形成可分享报告。': '完成设备功能、成品状态、缺陷整改及交付验收。',
  '覆盖材料、连接、垂直度、轴线方正、防腐和埋件节点。': '检查材料、连接、垂直度、轴线方正、防腐和埋件节点。',
  '从有筋扩展基础到地梁、柱插筋、混凝土及分层回填形成隐蔽链路。': '检查有筋扩展基础、地梁、柱插筋、混凝土及分层回填。',
  '可编辑节点名称、说明并继续新增检查项。': '记录本节点的验收范围、检查标准和现场结论。',
};
const STATUS_META = {
  pending: { label: '待检', icon: CircleDashed },
  pass: { label: '合格', icon: CheckCircle2 },
  rectify: { label: '待整改', icon: AlertTriangle },
  na: { label: '不适用', icon: Clock3 },
};

const clone = value => JSON.parse(JSON.stringify(value));
const pad = value => String(value).padStart(2, '0');
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const formatDateTime = value => {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const reportId = () => `BQ-${new Date().getFullYear()}${pad(new Date().getMonth() + 1)}${pad(new Date().getDate())}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const getItems = report => report?.nodes?.flatMap(node => node.items || []) || [];
const getStats = report => {
  const items = getItems(report);
  const inspected = items.filter(item => item.status !== 'pending').length;
  const passed = items.filter(item => item.status === 'pass').length;
  const rectify = items.filter(item => item.status === 'rectify').length;
  const photos = items.reduce((sum, item) => sum + (item.photos?.length || 0), 0);
  const progress = items.length ? Math.round((inspected / items.length) * 100) : 0;
  return { total: items.length, inspected, passed, rectify, photos, progress };
};

const getReportState = report => {
  const stats = getStats(report);
  if (stats.rectify) return { key: 'rectify', label: `${stats.rectify} 项待整改` };
  if (stats.progress === 100) return { key: 'pass', label: '验收完成' };
  return { key: 'pending', label: `进行中 ${stats.progress}%` };
};

const createReport = (templateKey, customType = 'nonstandard') => {
  const template = REPORT_TEMPLATES[templateKey];
  return {
    id: '',
    template: templateKey,
    customType,
    title: template.title,
    projectName: '',
    address: '',
    client: '',
    inspector: '',
    contractor: '',
    inspectionDate: today(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    overallNote: '',
    nodes: clone(template.buildNodes(customType)),
  };
};

const createSeedReport = () => {
  const report = createReport('steel');
  report.id = 'BQ-20260820-7K2QF';
  report.projectName = '顺义 · 林栖庭院住宅';
  report.address = '北京市顺义区示范项目';
  report.client = '张先生';
  report.inspector = '王工';
  report.contractor = '博笛智家项目组';
  report.inspectionDate = '2026-08-19';
  report.updatedAt = '2026-08-19T16:28:00';
  const items = getItems(report);
  items.slice(0, 11).forEach(item => { item.status = 'pass'; });
  items[5].status = 'rectify';
  items[5].note = '柱根局部蜂窝超出观感要求，已通知基础班组 8 月 21 日前修补并复验。';
  items[1].measured = '三级配电箱，漏保测试正常';
  items[4].measured = '主筋间距 150mm';
  report.overallNote = '基础及主体抽检完成，钢构节点有 1 项待整改，其余抽检项符合验收标准。';
  return report;
};

const migrateReportCopy = report => ({
  ...report,
  nodes: (report.nodes || []).map(node => ({
    ...node,
    phase: node.phase === '自定义' ? '专项验收' : node.phase,
    summary: LEGACY_COPY[node.summary] || node.summary,
    items: (node.items || []).map(item => ({
      ...item,
      source: item.source === '项目自定义' ? '项目验收标准' : item.source,
    })),
  })),
});

const loadReports = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(stored) && stored.length) return stored.map(report => report.id === 'BQ-20260820-7K2QF' ? createSeedReport() : migrateReportCopy(report));
  } catch {
    // Start with the built-in case if local data is unreadable.
  }
  return [createSeedReport()];
};

const compressImage = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('图片读取失败'));
  reader.onload = event => {
    const image = new Image();
    image.onerror = () => reject(new Error('图片解析失败'));
    image.onload = () => {
      const longest = Math.max(image.width, image.height);
      const scale = Math.min(1, 1280 / longest);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        url: canvas.toDataURL('image/jpeg', 0.76),
        createdAt: new Date().toISOString(),
      });
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>B</span><span>Q</span>
    </div>
  );
}

function StatusBadge({ status, label }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={14} aria-hidden="true" />
      {label || meta.label}
    </span>
  );
}

function ProgressRing({ value }) {
  return (
    <div className="progress-ring" style={{ '--progress': `${value * 3.6}deg` }} aria-label={`完成度 ${value}%`}>
      <div><strong>{value}</strong><span>%</span></div>
    </div>
  );
}

function Sidebar({ onHome, compact, onToggle }) {
  return (
    <aside className={`app-sidebar ${compact ? 'is-compact' : ''}`}>
      <div className="brand-lockup">
        <BrandMark />
        <div><strong>博笛质检</strong><span>BODHI QUALITY</span></div>
        <button className="mobile-menu-button" onClick={onToggle} aria-label="收起导航"><X size={20} /></button>
      </div>
      <nav aria-label="主导航">
        <button className="nav-item is-active" onClick={onHome}><LayoutDashboard size={19} />工作台</button>
        <button className="nav-item" onClick={onHome}><FileText size={19} />质检报告</button>
        <button className="nav-item" onClick={onHome}><BookOpenCheck size={19} />验收标准</button>
      </nav>
      <div className="sidebar-source">
        <ShieldCheck size={19} />
        <div><strong>验收依据</strong><span>钢构 · 砖混 · 内装<br />工程质量验收标准</span></div>
      </div>
      <div className="sidebar-user"><span>王</span><div><strong>质检工程师</strong><small>工程质量管理</small></div></div>
    </aside>
  );
}

function AppFrame({ children, onHome }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-frame">
      <Sidebar onHome={onHome} compact={!menuOpen} onToggle={() => setMenuOpen(false)} />
      {menuOpen && <button className="sidebar-scrim" aria-label="关闭导航" onClick={() => setMenuOpen(false)} />}
      <main className="app-main">
        <header className="mobile-header">
          <button onClick={() => setMenuOpen(true)} aria-label="打开导航"><Menu size={21} /></button>
          <div className="mobile-brand"><BrandMark /><strong>博笛质检</strong></div>
          <span />
        </header>
        {children}
      </main>
    </div>
  );
}

function Dashboard({ reports, onCreate, onOpen }) {
  const [query, setQuery] = useState('');
  const reportStats = useMemo(() => {
    const openIssues = reports.reduce((sum, report) => sum + getStats(report).rectify, 0);
    const complete = reports.filter(report => getStats(report).progress === 100).length;
    return { total: reports.length, openIssues, complete };
  }, [reports]);
  const filtered = reports.filter(report => `${report.projectName}${report.id}${report.title}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppFrame onHome={() => {}}>
      <div className="page-shell dashboard-page">
        <header className="page-header dashboard-header">
          <div>
            <p className="eyebrow">QUALITY CONTROL CENTER</p>
            <h1>质量报告中心</h1>
            <p>工程验收、问题整改与报告管理。</p>
          </div>
          <button className="primary-button" onClick={() => onCreate('steel')}><Plus size={18} />新建报告</button>
        </header>

        <section className="dashboard-overview" aria-label="报告概览">
          <div className="overview-copy">
            <span className="overview-kicker"><ShieldCheck size={16} />工程质量验收</span>
            <h2>项目质量验收与整改管理</h2>
            <p>覆盖开工准备、基础、主体、围护、水电防水、内装及竣工交付。</p>
            <button className="light-button" onClick={() => onCreate('custom')}><FilePlus2 size={18} />新建专项报告</button>
          </div>
          <div className="overview-metrics">
            <div><span>报告总数</span><strong>{reportStats.total}</strong><small>全部项目</small></div>
            <div><span>待整改</span><strong className={reportStats.openIssues ? 'text-warning' : ''}>{reportStats.openIssues}</strong><small>待办问题</small></div>
            <div><span>已完成</span><strong>{reportStats.complete}</strong><small>完成报告</small></div>
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div><span className="section-index">01</span><div><h2>选择验收方案</h2><p>按工程类型选择对应的验收范围和检查标准。</p></div></div>
          </div>
          <div className="template-grid">
            {Object.values(REPORT_TEMPLATES).map((template, index) => {
              const icons = [Building2, House, ClipboardCheck, Wrench];
              const Icon = icons[index];
              return (
                <article className={`template-card template-${template.key}`} key={template.key}>
                  <div className="template-card-top"><span className="template-icon"><Icon size={22} /></span><span>{template.duration}</span></div>
                  <h3>{template.title}</h3>
                  <p>{template.description}</p>
                  <div className="template-source"><BookOpenCheck size={15} />{template.handbook}</div>
                  <button onClick={() => onCreate(template.key)}>创建报告<ChevronRight size={17} /></button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section-block reports-section">
          <div className="section-heading report-heading">
            <div><span className="section-index">02</span><div><h2>最近报告</h2><p>继续录入、查看详情或复制报告链接。</p></div></div>
            <label className="search-field"><Search size={17} /><span className="sr-only">搜索报告</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索项目或报告编号" /></label>
          </div>
          <div className="report-table" role="table" aria-label="最近报告">
            <div className="report-row report-row-header" role="row"><span>项目</span><span>报告类型</span><span>更新时间</span><span>进度</span><span>状态</span><span /></div>
            {filtered.map(report => {
              const stats = getStats(report);
              const state = getReportState(report);
              return (
                <button className="report-row" role="row" key={report.id} onClick={() => onOpen(report.id)}>
                  <span className="report-project"><strong>{report.projectName || '新建项目'}</strong><small>{report.id || '待生成编号'}</small></span>
                  <span>{REPORT_TEMPLATES[report.template]?.shortTitle || report.title}</span>
                  <span>{formatDateTime(report.updatedAt)}</span>
                  <span className="table-progress"><i><b style={{ width: `${stats.progress}%` }} /></i><em>{stats.progress}%</em></span>
                  <span><StatusBadge status={state.key} label={state.label} /></span>
                  <span className="row-arrow"><ChevronRight size={18} /></span>
                </button>
              );
            })}
            {!filtered.length && <div className="empty-state"><FileText size={28} /><strong>没有找到报告</strong><span>调整搜索条件，或新建一份验收报告。</span></div>}
          </div>
        </section>
      </div>
    </AppFrame>
  );
}

function ProjectFields({ draft, onChange }) {
  const field = (key, label, placeholder, icon) => {
    const Icon = icon;
    return (
      <label className="field-control">
        <span>{label}</span>
        <div>{Icon && <Icon size={16} />}<input value={draft[key]} onChange={event => onChange(key, event.target.value)} placeholder={placeholder} /></div>
      </label>
    );
  };
  return (
    <div className="project-fields">
      {field('projectName', '项目名称 *', '例：顺义林栖庭院住宅', Building2)}
      {field('address', '项目地址', '省 / 市 / 区 / 详细地址', MapPin)}
      {field('client', '业主 / 委托方', '姓名或单位', UserRound)}
      {field('inspector', '质检负责人', '验收人员', ClipboardCheck)}
      {field('contractor', '施工单位', '公司或班组', Building2)}
      {field('inspectionDate', '验收日期', '', CalendarDays)}
    </div>
  );
}

function PhotoUploader({ photos, onAdd, onRemove, inputId }) {
  return (
    <div className="photo-uploader">
      <div className="photo-grid">
        {(photos || []).map(photo => (
          <figure key={photo.id}>
            <img src={photo.url} alt={photo.name || '现场验收照片'} />
            <button type="button" onClick={() => onRemove(photo.id)} aria-label={`移除 ${photo.name || '照片'}`}><X size={15} /></button>
          </figure>
        ))}
        {(photos?.length || 0) < 6 && (
          <label className="photo-add" htmlFor={inputId}>
            <ImagePlus size={21} />
            <span>上传照片</span>
            <small>最多 6 张</small>
            <input id={inputId} type="file" accept="image/*" multiple onChange={event => onAdd(event.target.files)} />
          </label>
        )}
      </div>
    </div>
  );
}

function InspectionItem({ item, nodeId, editable, onUpdate, onPhotos, onRemovePhoto, onRemoveItem }) {
  return (
    <article className={`inspection-item item-${item.status}`}>
      <div className="inspection-item-head">
        <div className="item-title-block">
          {editable ? (
            <input className="inline-title-input" value={item.title} onChange={event => onUpdate('title', event.target.value)} aria-label="检查项名称" />
          ) : <h4>{item.title}</h4>}
          <span className="source-label"><BookOpenCheck size={13} />{item.source}</span>
        </div>
        {editable && <button className="icon-button danger-button" onClick={onRemoveItem} aria-label="删除检查项"><Trash2 size={16} /></button>}
      </div>
      <div className="standard-box">
        <strong>验收标准</strong>
        {editable ? <textarea value={item.standard} onChange={event => onUpdate('standard', event.target.value)} aria-label="验收标准" /> : <p>{item.standard}</p>}
        <span><Camera size={14} />取证：{item.evidence}</span>
      </div>
      <fieldset className="status-selector">
        <legend>检查结论</legend>
        {STATUS_OPTIONS.map(option => (
          <label key={option.key} className={`status-choice choice-${option.key}`}>
            <input type="radio" name={`status-${nodeId}-${item.id}`} checked={item.status === option.key} onChange={() => onUpdate('status', option.key)} />
            <span>{item.status === option.key && <Check size={14} />}{option.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="item-inputs">
        <label><span>实测值 / 现场结果</span><input value={item.measured} onChange={event => onUpdate('measured', event.target.value)} placeholder="例：偏差 2mm / 压力 0.8MPa" /></label>
        <label><span>备注与整改要求</span><textarea value={item.note} onChange={event => onUpdate('note', event.target.value)} placeholder="问题描述、责任人、整改期限或复验结论" /></label>
      </div>
      <PhotoUploader
        photos={item.photos}
        inputId={`photo-${nodeId}-${item.id}`}
        onAdd={files => onPhotos(files)}
        onRemove={onRemovePhoto}
      />
    </article>
  );
}

function ReportEditor({ initialReport, initialNodeId, onBack, onGenerate, onGenerateNode, showToast }) {
  const [draft, setDraft] = useState(() => clone(initialReport));
  const [activeNodeId, setActiveNodeId] = useState(() => initialReport.nodes.some(node => node.id === initialNodeId) ? initialNodeId : initialReport.nodes[0]?.id);
  const [uploading, setUploading] = useState(false);
  const activeNode = draft.nodes.find(node => node.id === activeNodeId) || draft.nodes[0];
  const stats = getStats(draft);

  const updateProject = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const updateNode = (nodeId, updater) => setDraft(current => ({
    ...current,
    nodes: current.nodes.map(node => node.id === nodeId ? updater(node) : node),
  }));
  const updateItem = (nodeId, itemId, key, value) => updateNode(nodeId, node => ({
    ...node,
    items: node.items.map(item => item.id === itemId ? { ...item, [key]: value } : item),
  }));
  const handlePhotos = async (nodeId, itemId, fileList) => {
    const files = Array.from(fileList || []).slice(0, 6);
    if (!files.length) return;
    setUploading(true);
    try {
      const prepared = await Promise.all(files.map(compressImage));
      updateNode(nodeId, node => ({
        ...node,
        items: node.items.map(item => item.id === itemId ? { ...item, photos: [...(item.photos || []), ...prepared].slice(0, 6) } : item),
      }));
      showToast(`已添加 ${prepared.length} 张现场照片`);
    } catch (error) {
      showToast(error.message || '图片处理失败', 'error');
    } finally {
      setUploading(false);
    }
  };
  const removePhoto = (nodeId, itemId, photoId) => updateNode(nodeId, node => ({
    ...node,
    items: node.items.map(item => item.id === itemId ? { ...item, photos: item.photos.filter(photo => photo.id !== photoId) } : item),
  }));
  const addNode = () => {
    const id = `custom-node-${Date.now()}`;
    setDraft(current => ({ ...current, nodes: [...current.nodes, { id, title: '新验收节点', phase: '专项验收', summary: '填写本节点的验收范围和说明。', items: [] }] }));
    setActiveNodeId(id);
  };
  const addItem = nodeId => {
    const id = `custom-item-${Date.now()}`;
    updateNode(nodeId, node => ({ ...node, items: [...node.items, { id, title: '新检查项', standard: '请输入判定标准、允许偏差或整改要求。', source: '项目验收标准', evidence: '按项目要求上传', status: 'pending', measured: '', note: '', photos: [], custom: true }] }));
  };
  const removeItem = (nodeId, itemId) => updateNode(nodeId, node => ({ ...node, items: node.items.filter(item => item.id !== itemId) }));
  const validateReport = node => {
    if (!draft.projectName.trim()) {
      showToast('请先填写项目名称', 'error');
      document.querySelector('.project-fields input')?.focus();
      return false;
    }
    const itemCount = node ? (node.items?.length || 0) : getItems(draft).length;
    if (!itemCount) {
      showToast(node ? '当前节点至少需要一个检查项' : '报告至少需要一个检查项', 'error');
      return false;
    }
    return true;
  };
  const generate = () => {
    if (!validateReport()) return;
    onGenerate({ ...draft, updatedAt: new Date().toISOString() });
  };
  const generateNode = () => {
    if (!activeNode || !validateReport(activeNode)) return;
    onGenerateNode({ ...draft, updatedAt: new Date().toISOString() }, activeNode.id);
  };

  return (
    <AppFrame onHome={onBack}>
      <div className="editor-page">
        <header className="editor-topbar">
          <button className="back-button" onClick={onBack}><ArrowLeft size={18} />返回工作台</button>
          <div className="editor-title"><span>{REPORT_TEMPLATES[draft.template].shortTitle}</span><strong>{draft.projectName || '新建质检报告'}</strong></div>
          <div className="editor-actions"><span className="save-state"><Check size={14} />现场验收记录</span><button className="primary-button" onClick={generate} disabled={uploading}><FileText size={17} />生成竣工验收报告</button></div>
        </header>
        <div className="editor-content">
          <section className="editor-project-card">
            <div className="editor-card-heading">
              <div><span>01</span><div><h1>项目与报告信息</h1><p>填写项目基本信息和本次验收信息。</p></div></div>
              <div className="editor-progress"><strong>{stats.progress}%</strong><span>已完成 {stats.inspected}/{stats.total}</span></div>
            </div>
            {draft.template === 'custom' && (
              <div className="custom-type-strip">
                <label><span>专项报告类型</span><select value={draft.customType} onChange={event => updateProject('customType', event.target.value)}>{CUSTOM_REPORT_TYPES.map(type => <option key={type.key} value={type.key}>{type.label}</option>)}</select></label>
                <p>{CUSTOM_REPORT_TYPES.find(type => type.key === draft.customType)?.description}</p>
              </div>
            )}
            <ProjectFields draft={draft} onChange={updateProject} />
          </section>

          <section className="editor-workspace">
            <aside className="node-sidebar">
              <div className="node-sidebar-head"><div><span>02</span><strong>验收大节点</strong></div>{draft.template === 'custom' && <button onClick={addNode} aria-label="新增节点"><Plus size={17} /></button>}</div>
              <div className="node-list">
                {draft.nodes.map((node, index) => {
                  const nodeStats = getStats({ nodes: [node] });
                  return (
                    <button key={node.id} className={activeNodeId === node.id ? 'is-active' : ''} onClick={() => setActiveNodeId(node.id)}>
                      <span>{pad(index + 1)}</span><div><strong>{node.title}</strong><small>{nodeStats.inspected}/{nodeStats.total} 已检查</small></div><ChevronRight size={17} />
                    </button>
                  );
                })}
              </div>
              <div className="manual-note"><BookOpenCheck size={17} /><p><strong>现场取证要求</strong>照片需包含统一标识、地理位置和时间；关键尺寸与节点应留近景。</p></div>
            </aside>

            {activeNode && (
              <div className="node-editor">
                <header className="node-editor-head">
                  <div className="node-number">{pad(draft.nodes.findIndex(node => node.id === activeNode.id) + 1)}</div>
                  <div className="node-head-copy">
                    {draft.template === 'custom' ? <input value={activeNode.title} onChange={event => updateNode(activeNode.id, node => ({ ...node, title: event.target.value }))} aria-label="节点名称" /> : <h2>{activeNode.title}</h2>}
                    {draft.template === 'custom' ? <textarea value={activeNode.summary} onChange={event => updateNode(activeNode.id, node => ({ ...node, summary: event.target.value }))} aria-label="节点说明" /> : <p>{activeNode.summary}</p>}
                  </div>
                  <div className="node-head-actions">
                    <StatusBadge status={getStats({ nodes: [activeNode] }).rectify ? 'rectify' : getStats({ nodes: [activeNode] }).progress === 100 ? 'pass' : 'pending'} />
                    <button className="secondary-button node-report-button no-print" onClick={generateNode} disabled={uploading}><Printer size={15} />导出节点报告</button>
                  </div>
                </header>
                <div className="node-items">
                  {activeNode.items.map((item, index) => (
                    <div className="numbered-item" key={item.id}>
                      <span className="item-sequence">{pad(index + 1)}</span>
                      <InspectionItem
                        item={item}
                        nodeId={activeNode.id}
                        editable={draft.template === 'custom' || item.custom}
                        onUpdate={(key, value) => updateItem(activeNode.id, item.id, key, value)}
                        onPhotos={files => handlePhotos(activeNode.id, item.id, files)}
                        onRemovePhoto={photoId => removePhoto(activeNode.id, item.id, photoId)}
                        onRemoveItem={() => removeItem(activeNode.id, item.id)}
                      />
                    </div>
                  ))}
                  {!activeNode.items.length && <div className="empty-node"><ClipboardCheck size={26} /><strong>这个节点还没有检查项</strong><span>添加第一项验收内容开始记录。</span></div>}
                  <button className="add-item-button" onClick={() => addItem(activeNode.id)}><Plus size={17} />新增检查项</button>
                </div>
                <div className="node-next-row">
                  <span>节点 {draft.nodes.findIndex(node => node.id === activeNode.id) + 1} / {draft.nodes.length}</span>
                  {draft.nodes.findIndex(node => node.id === activeNode.id) < draft.nodes.length - 1 ? (
                    <button onClick={() => setActiveNodeId(draft.nodes[draft.nodes.findIndex(node => node.id === activeNode.id) + 1].id)}>下一节点<ChevronRight size={17} /></button>
                  ) : <button onClick={generate}>生成竣工验收报告<FileText size={17} /></button>}
                </div>
              </div>
            )}
          </section>
        </div>
        <div className="mobile-generate-bar"><div><strong>{stats.progress}%</strong><span>{stats.inspected}/{stats.total} 已检查</span></div><button onClick={generate}><FileText size={17} />生成竣工报告</button></div>
      </div>
    </AppFrame>
  );
}

function ReportItemView({ item, index }) {
  return (
    <article className="report-item-view">
      <header><span>{pad(index + 1)}</span><div><h4>{item.title}</h4><small>{item.source}</small></div><StatusBadge status={item.status} /></header>
      <div className="report-standard"><strong>判定标准</strong><p>{item.standard}</p></div>
      {(item.measured || item.note) && <div className="report-result-grid">{item.measured && <div><span>现场结果</span><strong>{item.measured}</strong></div>}{item.note && <div><span>备注 / 整改</span><strong>{item.note}</strong></div>}</div>}
      {item.photos?.length ? <div className="report-photo-grid">{item.photos.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.name || `${item.title}现场照片`} /><figcaption>{photo.name || '现场照片'}</figcaption></figure>)}</div> : <div className="report-no-photo"><Camera size={16} />未上传现场照片</div>}
    </article>
  );
}

function ReportView({ report, nodeId, onBack, onOpenFinal, onOpenNode, onEdit, onCopy, showToast }) {
  if (!report) {
    return (
      <AppFrame onHome={onBack}>
        <div className="missing-report"><FileText size={36} /><h1>未找到报告</h1><p>报告链接无效或报告已不存在，请返回报告列表重新选择。</p><button className="primary-button" onClick={onBack}>返回工作台</button></div>
      </AppFrame>
    );
  }
  const nodeIndex = report.nodes.findIndex(node => node.id === nodeId);
  const selectedNode = nodeIndex >= 0 ? report.nodes[nodeIndex] : null;
  const isNodeReport = Boolean(selectedNode);
  const reportScope = isNodeReport ? { ...report, nodes: [selectedNode] } : report;
  const stats = getStats(reportScope);
  const state = getReportState(reportScope);
  const copyLink = async () => {
    try {
      await onCopy(report.id, selectedNode?.id);
      showToast(isNodeReport ? '节点报告链接已复制' : '竣工验收报告链接已复制');
    } catch {
      showToast('复制失败，请从地址栏复制链接', 'error');
    }
  };
  return (
    <AppFrame onHome={onBack}>
      <div className="report-view-page">
        <header className="report-toolbar no-print">
          <button className="back-button" onClick={isNodeReport ? () => onOpenFinal(report.id) : onBack}><ArrowLeft size={18} />{isNodeReport ? '返回竣工报告' : '返回工作台'}</button>
          <div><button className="secondary-button" onClick={() => onEdit(report, selectedNode?.id)}><ClipboardCheck size={17} />继续编辑</button><button className="secondary-button" onClick={() => window.print()}><Printer size={17} />打印 / PDF</button><button className="primary-button" onClick={copyLink}><Copy size={17} />{isNodeReport ? '复制节点报告链接' : '复制竣工报告链接'}</button></div>
        </header>
        <div className="report-document">
          <section className="report-cover">
            <div className="report-cover-top"><div className="report-brand"><BrandMark /><div><strong>博笛智家</strong><span>工程质量验收报告</span></div></div><span className="report-number">REPORT · {report.id}{isNodeReport ? `-${pad(nodeIndex + 1)}` : ''}</span></div>
            <div className="report-hero">
              <div className="report-hero-copy"><span className="report-type">{isNodeReport ? `节点验收报告 · ${selectedNode.phase}` : `竣工验收报告 · ${REPORT_TEMPLATES[report.template]?.shortTitle || report.title}`}</span><h1>{isNodeReport ? selectedNode.title : report.projectName}</h1><p>{isNodeReport ? `${report.projectName} · ${report.address || '项目地址未填写'}` : report.address || '项目地址未填写'}</p><StatusBadge status={state.key} label={state.label} /></div>
              <ProgressRing value={stats.progress} />
            </div>
            <div className="report-info-grid">
              <div><span>委托方 / 业主</span><strong>{report.client || '—'}</strong></div>
              <div><span>质检负责人</span><strong>{report.inspector || '—'}</strong></div>
              <div><span>施工单位</span><strong>{report.contractor || '—'}</strong></div>
              <div><span>验收日期</span><strong>{report.inspectionDate || '—'}</strong></div>
            </div>
            <div className="report-stat-band">
              <div><strong>{isNodeReport ? pad(nodeIndex + 1) : report.nodes.length}</strong><span>{isNodeReport ? '当前验收节点' : '验收大节点'}</span></div>
              <div><strong>{stats.total}</strong><span>检查项</span></div>
              <div><strong>{stats.passed}</strong><span>合格项</span></div>
              <div><strong className={stats.rectify ? 'text-warning' : ''}>{stats.rectify}</strong><span>待整改</span></div>
              <div><strong>{stats.photos}</strong><span>现场照片</span></div>
            </div>
            {!isNodeReport && report.overallNote && <div className="overall-note"><strong>竣工验收综述</strong><p>{report.overallNote}</p></div>}
          </section>

          {!isNodeReport && <section className="report-directory">
            <div className="report-section-title"><span>01</span><div><h2>验收节点总览</h2><p>按施工顺序列示各验收节点和完成情况。</p></div></div>
            <div className="directory-grid">
              {report.nodes.map((node, index) => {
                const nodeStats = getStats({ nodes: [node] });
                return <div key={node.id}><span>{pad(index + 1)}</span><div><strong>{node.title}</strong><small>{node.phase} · {nodeStats.inspected}/{nodeStats.total} 已检</small></div><div className="directory-actions"><StatusBadge status={nodeStats.rectify ? 'rectify' : nodeStats.progress === 100 ? 'pass' : 'pending'} /><button className="no-print" onClick={() => onOpenNode(report.id, node.id)}>查看节点报告<ChevronRight size={13} /></button></div></div>;
              })}
            </div>
          </section>}

          <section className="report-detail-section">
            <div className="report-section-title"><span>{isNodeReport ? '01' : '02'}</span><div><h2>{isNodeReport ? '节点验收明细' : '现场验收明细'}</h2><p>结论、实测记录、整改说明与照片证据。</p></div></div>
            {reportScope.nodes.map((node, scopedNodeIndex) => {
              const nodeStats = getStats({ nodes: [node] });
              const displayIndex = isNodeReport ? nodeIndex : scopedNodeIndex;
              return (
                <section className="report-node" key={node.id}>
                  <header className="report-node-head"><span>{pad(displayIndex + 1)}</span><div><small>{node.phase}</small><h3>{node.title}</h3><p>{node.summary}</p></div><div className="node-score"><strong>{nodeStats.progress}%</strong><span>{nodeStats.inspected}/{nodeStats.total}</span></div></header>
                  <div className="report-items-list">{node.items.map((item, index) => <ReportItemView key={item.id} item={item} index={index} />)}</div>
                </section>
              );
            })}
          </section>

          <footer className="report-footer"><div className="report-brand"><BrandMark /><div><strong>博笛智家</strong><span>{isNodeReport ? '节点验收报告' : '竣工验收报告'}</span></div></div><div><span>{isNodeReport ? '节点报告编号' : '竣工报告编号'}</span><strong>{report.id}{isNodeReport ? `-${pad(nodeIndex + 1)}` : ''}</strong><small>生成时间 {formatDateTime(report.updatedAt)}</small></div></footer>
        </div>
      </div>
    </AppFrame>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  return <div className={`toast toast-${toast.type || 'success'}`} role="status">{toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}<span>{toast.message}</span><button onClick={onClose} aria-label="关闭提示"><X size={15} /></button></div>;
}

export default function InspectionReportApp() {
  const [reports, setReports] = useState(loadReports);
  const [screen, setScreen] = useState(() => new URLSearchParams(window.location.search).get('report') ? 'report' : 'dashboard');
  const [activeReportId, setActiveReportId] = useState(() => new URLSearchParams(window.location.search).get('report') || '');
  const [activeNodeId, setActiveNodeId] = useState(() => new URLSearchParams(window.location.search).get('node') || '');
  const [editingReport, setEditingReport] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState('');
  const [toast, setToast] = useState(null);
  const lastStorageError = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      lastStorageError.current = false;
    } catch {
      if (!lastStorageError.current) {
        lastStorageError.current = true;
        setToast({ type: 'error', message: '报告存储空间不足，请减少照片数量后重试。' });
      }
    }
  }, [reports]);

  useEffect(() => {
    const handlePop = () => {
      const id = new URLSearchParams(window.location.search).get('report');
      const nodeId = new URLSearchParams(window.location.search).get('node');
      setActiveReportId(id || '');
      setActiveNodeId(nodeId || '');
      setScreen(id ? 'report' : 'dashboard');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const goHome = () => {
    window.history.pushState({}, '', window.location.pathname);
    setScreen('dashboard');
    setActiveReportId('');
    setActiveNodeId('');
    setEditingReport(null);
    setEditingNodeId('');
  };
  const startCreate = templateKey => {
    setEditingReport(createReport(templateKey));
    setEditingNodeId('');
    setScreen('editor');
  };
  const openReport = (id, nodeId = '') => {
    const nodeQuery = nodeId ? `&node=${encodeURIComponent(nodeId)}` : '';
    window.history.pushState({}, '', `${window.location.pathname}?report=${encodeURIComponent(id)}${nodeQuery}`);
    setActiveReportId(id);
    setActiveNodeId(nodeId);
    setScreen('report');
  };
  const saveReport = draft => {
    const report = { ...draft, id: draft.id || reportId(), updatedAt: new Date().toISOString() };
    setReports(current => [report, ...current.filter(item => item.id !== report.id)]);
    setEditingReport(null);
    setEditingNodeId('');
    return report;
  };
  const saveAndOpen = draft => {
    const report = saveReport(draft);
    openReport(report.id);
    showToast('竣工验收报告已生成，可复制链接或打印为 PDF');
  };
  const saveAndOpenNode = (draft, nodeId) => {
    const report = saveReport(draft);
    openReport(report.id, nodeId);
    showToast('节点验收报告已生成，可打印或复制链接');
  };
  const editReport = (report, nodeId = '') => {
    setEditingReport(clone(report));
    setEditingNodeId(nodeId);
    setScreen('editor');
  };
  const copyReportLink = async (id, nodeId = '') => {
    const url = new URL(window.location.href);
    url.pathname = window.location.pathname;
    url.search = `?report=${encodeURIComponent(id)}${nodeId ? `&node=${encodeURIComponent(nodeId)}` : ''}`;
    url.hash = '';
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(url.toString());
    const textarea = document.createElement('textarea');
    textarea.value = url.toString();
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  const activeReport = reports.find(report => report.id === activeReportId);
  return (
    <>
      {screen === 'dashboard' && <Dashboard reports={reports} onCreate={startCreate} onOpen={openReport} />}
      {screen === 'editor' && editingReport && <ReportEditor initialReport={editingReport} initialNodeId={editingNodeId} onBack={goHome} onGenerate={saveAndOpen} onGenerateNode={saveAndOpenNode} showToast={showToast} />}
      {screen === 'report' && <ReportView report={activeReport} nodeId={activeNodeId} onBack={goHome} onOpenFinal={openReport} onOpenNode={openReport} onEdit={editReport} onCopy={copyReportLink} showToast={showToast} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
