export const CUSTOM_REPORT_TYPES = [
  { key: 'nonstandard', label: '非标工程', description: '特殊构造、样板试做及其他非标准工程' },
  { key: 'defect', label: '缺陷巡检', description: '集中登记质量缺陷、责任与整改复验' },
  { key: 'minor', label: '零星工程', description: '维修、增补、局部改造等短周期项目' },
  { key: 'other', label: '自定义', description: '按项目需要设置验收节点和检查项' },
];

const item = (id, title, standard, source, evidence = '全景 + 尺寸或关键部位近景') => ({
  id,
  title,
  standard,
  source,
  evidence,
  status: 'pending',
  measured: '',
  note: '',
  photos: [],
});

const node = (id, title, phase, summary, items) => ({ id, title, phase, summary, items });

const sharedPreparation = () => node(
  'preparation',
  '开工准备与场地移交',
  '开工前',
  '确认场地、临水临电、安全设施及成品保护满足开工条件。',
  [
    item('site-before-after', '拆除及场地全景', '拆除前后取同角度全景；红线范围内整洁，道路通畅、无障碍和隐患。', '钢构/砖混分册 P6', '拆除前、拆除后、道路及整个场地'),
    item('temporary-utilities', '临水、临电', '供水主管接通并保护水表；临电使用三级或更高标准配电箱，材料堆放避开取水及通行区域。', '钢构/砖混分册 P6'),
    item('fire-protection', '临时消防与下水口保护', '每 50㎡至少配置 1 个灭火器；下水口封堵保护，成品门窗及地面防护完整。', '内装分册 P5', '灭火器、下水口、门窗及地面保护'),
  ],
);

const sharedMEP = () => node(
  'mep',
  '水电隐蔽与防水',
  '隐蔽验收',
  '隐蔽前完成水压、管线、开槽、防水高度及闭水记录。',
  [
    item('pipe-spacing', '冷热水口与管卡间距', '花洒冷热水口间距 150mm；管卡间距 600mm；弯头、三通 200mm 范围内设固定点。', '内装分册 P6'),
    item('pressure-test', '给水管打压', '试验压力 0.8MPa，保压 1 小时，压力降不大于 0.05MPa。', '内装分册 P6', '打压全景、初始压力、结束压力'),
    item('chasing-wiring', '线槽与线盒', '横向开槽不超过 300mm；裸露线头使用压线帽或绝缘胶布包裹，强弱电分设。', '内装分册 P6'),
    item('waterproof', '卫生间防水与闭水', '淋浴区防水高度 1800mm、宽度两侧各约 1000mm；其他墙面 300mm，浴室柜处 1000mm；干燥后闭水 24 小时无渗漏。', '内装分册 P13', '防水高度、厚度、阴阳角、闭水液面及楼下检查'),
  ],
);

const sharedFinishes = () => node(
  'finishes',
  '内装面层与设备安装',
  '面层验收',
  '检查平整度、垂直度、空鼓、色差、安装精度和设备功能。',
  [
    item('wall-base', '墙面基层与阴阳角', '基层顺直平整；钢结构墙面抗裂砂浆网格布搭接不小于 150mm；所有阴阳角设置护角。', '内装分册 P10-P12'),
    item('wall-flatness', '墙面平整度、顺直度', '使用 2m 靠尺和塞尺检查，平整度误差不超过 3mm；阴阳角顺直。', '内装分册 P12'),
    item('wall-finish', '墙板或涂料面层', '表面平整、无明显翘曲和破损；涂料颜色均匀，无流坠、疙瘩、孔洞，分色线顺直。', '内装分册 P18'),
    item('floor-finish', '地面平整度与空鼓', '使用 2m 靠尺检查，偏差不超过 3mm；响鼓锤检查无空鼓。', '内装分册 P30'),
    item('countertop', '台面安装平整度', '靠尺、塞尺、水平尺检测，台面平偏差在 3mm 以内。', '内装分册 P22'),
    item('outlets', '强电插座测试', '相位仪指示正常；并列插座上口齐平，安装误差小于 0.5mm。', '内装分册 P26'),
  ],
);

const sharedCompletion = () => node(
  'completion',
  '竣工功能与交付',
  '交付前',
  '完成设备功能、成品状态、缺陷整改及交付验收。',
  [
    item('systems', '水、电、门窗及设备功能', '给排水通畅无渗漏，开关插座与设备工作正常，门窗启闭顺畅、五金完整。', '内装分册综合标准', '功能测试视频或连续照片'),
    item('cleaning', '完工清洁与成品状态', '厨房、卫浴和五金洁净无污渍；灶具、洁具、墙地面无残胶、划伤和施工垃圾。', '内装分册 P34'),
    item('rectification', '缺陷闭环与交付确认', '所有待整改项明确责任人、期限并上传复验照片；交付结论与签认信息完整。', '报告闭环规则', '整改前后同角度照片'),
  ],
);

const steelNodes = () => [
  sharedPreparation(),
  node('steel-foundation', '基础放线与混凝土', '基础验收', '对定位、钢筋、模板、混凝土浇筑与拆模养护进行隐蔽验收。', [
    item('steel-setting-out', '基础定位与尺寸', '独立基础按图放线；检查承台宽度、高度和混凝土标高，关键点抽检不少于 30%。', '钢构分册 P9'),
    item('steel-rebar', '独立基础钢筋', '复核钢筋规格、间距、锚固和保护层；附定位关系与尺寸照片，关键点抽检不少于 30%。', '钢构分册 P9'),
    item('steel-concrete', '基础混凝土浇筑与养护', 'C30 混凝土资料齐全，振捣密实；拆模后无大于 0.05㎡的蜂窝或离析，24 小时内开始养护。', '钢构分册 P17'),
  ]),
  node('steel-frame', '钢结构主体', '主体验收', '检查材料、连接、垂直度、轴线方正、防腐和埋件节点。', [
    item('steel-material', '钢构材料与合格资料', '型钢、螺栓和焊材规格与设计一致，合格证明、检验记录和材料标识完整。', '钢构分册主体章节'),
    item('steel-alignment', '钢柱垂直与轴线方正', '钢柱垂直度不大于 2mm；房间轴线方正偏差不大于 5mm。', '钢构分册 P13', '垂直度、轴线尺寸、房间方正'),
    item('steel-joints', '焊缝、螺栓、防腐与节点', '主梁节点焊接完整；螺栓紧固；切伤处防腐；安全带、梁筋连接及埋入钢柱钢筋节点留影。', '钢构分册 P13', '全数梁柱节点或按项目方案抽检'),
  ]),
  node('steel-envelope', '墙板、楼面与屋面围护', '围护验收', '验收 ALC 墙板、楼面板、檩条、焊接防腐及洞口节点。', [
    item('alc-material', 'ALC 墙板材料进场', '堆放整齐，品牌与交底封样一致；外观平整，无明显缺角、裂缝和磕碰，资料齐全。', '钢构分册 P21'),
    item('alc-install', '墙板安装与洞口', '按图放线；垂直、平整、方正；错缝规范、砂浆饱满、钢柱接缝处理完整，洞口尺寸复核不少于 30%。', '钢构分册 P21'),
    item('floor-roof', '楼面板、次梁与屋面', '材料、型号及壁厚复核；檩条间距和焊接防腐完整，排水坡度、泛水和收边密封连续。', '钢构分册 P25'),
  ]),
  sharedMEP(),
  sharedFinishes(),
  sharedCompletion(),
];

const masonryNodes = () => [
  sharedPreparation(),
  node('masonry-foundation', '基础、地梁与回填', '基础验收', '检查有筋扩展基础、地梁、柱插筋、混凝土及分层回填。', [
    item('spread-foundation', '有筋扩展基础', '钢筋绑扎验收；控制基础平整度、厚度和材料用量，C30 混凝土资料完整，收面无裂缝。', '砖混分册 P9'),
    item('foundation-beam', '基础梁钢筋', '复核受力筋和箍筋规格、间距、加密、保护层及搭接长度；每 100 延米不少于 4 处抽检。', '砖混分册 P13'),
    item('backfill', '基础地梁回填', '分层、由四周向中心夯实；环刀或填砂复核夯实度，每 10㎡设置不少于 3 根找平定位桩。', '砖混分册 P17'),
  ]),
  node('masonry-structure', '砖混主体与楼板', '主体验收', '验收砖材、砌筑垂直度、灰缝饱满、钢筋及混凝土楼板。', [
    item('brick-material', '墙体原材料', '红砖堆放整齐，品牌与封样一致；无明显缺角；砌筑前湿润，水泥和中砂型号、质量、有效期符合要求。', '砖混分册 P21'),
    item('brickwork', '墙体砌筑垂直度', '施工中吊线；灰缝饱和度大于 90%；砌筑砂浆水泥砂比 1:3。', '砖混分册 P21'),
    item('slab-concrete', '顶板钢筋与混凝土', '底层平整并湿润；C30 混凝土资料齐全，浇筑振捣密实、收面平整，按 3-6 小时间隔记录收面及养护。', '砖混分册 P25'),
  ]),
  node('masonry-envelope', '屋面、外墙与门窗洞口', '围护验收', '检查屋面防水排水、外墙保温饰面、门窗洞口及防渗节点。', [
    item('roof-waterproof', '屋面防水与排水', '基层、找平、保温、防水层、泛水及排水坡度连续；收边密封无开裂并完成淋水或蓄水记录。', '砖混/内装分册综合标准'),
    item('external-wall', '外墙保温与饰面', '保温固定、网格布搭接、阴阳角和滴水节点完整；饰面平整、分格顺直、无渗水。', '内装分册外装工期节点'),
    item('openings', '门窗洞口与安装条件', '洞口尺寸、标高、垂直方正符合图纸；连接、防水收口和成品保护完整。', '内装分册门窗节点'),
  ]),
  sharedMEP(),
  sharedFinishes(),
  sharedCompletion(),
];

const interiorNodes = () => [
  sharedPreparation(),
  sharedMEP(),
  node('interior-base', '基层、地暖与防水闭合', '基层验收', '在封板铺贴前完成墙地面基层、地暖保压和卫生间闭水。', [
    item('plaster-base', '粉刷石膏或抗裂砂浆找平', '墙面及阴阳角顺直平整；钢结构墙面网格布搭接不小于 150mm。', '内装分册 P10-P11'),
    item('base-flatness', '墙面平整度与阴阳角', '2m 靠尺检查，误差不超过 3mm；护角安装完整，阴阳角顺直。', '内装分册 P12'),
    item('floor-heating', '地暖敷设与回填', '边界保温、保温板、反射膜和管路固定完整；完成保压，48 小时无泄漏后回填。', '内装分册 P14'),
    item('bathroom-waterproof', '卫生间防水闭水', '按区域检查高度与厚度；防水干燥后闭水 24 小时，墙体及楼下无渗漏。', '内装分册 P13'),
  ]),
  sharedFinishes(),
  sharedCompletion(),
];

const customNodes = customType => [
  node('custom-node-1', CUSTOM_REPORT_TYPES.find(type => type.key === customType)?.label || '自定义验收节点', '专项验收', '记录本节点的验收范围、检查标准和现场结论。', [
    item('custom-item-1', '自定义检查项', '请输入适用于本工程的判定标准、允许偏差或整改要求。', '项目验收标准', '按项目要求上传照片或附件'),
  ]),
];

export const REPORT_TEMPLATES = {
  steel: {
    key: 'steel',
    title: '钢结构住宅全周期',
    shortTitle: '钢构全周期',
    description: '钢构基础、主体、ALC 围护、水电、内装和交付',
    handbook: '钢构分册 + 内装分册',
    duration: '约 40-75 天',
    buildNodes: steelNodes,
  },
  masonry: {
    key: 'masonry',
    title: '砖混住宅全周期',
    shortTitle: '砖混全周期',
    description: '扩展基础、砖混主体、屋面外墙、水电、内装和交付',
    handbook: '砖混分册 + 内装分册',
    duration: '约 83 天',
    buildNodes: masonryNodes,
  },
  interior: {
    key: 'interior',
    title: '内装专项验收',
    shortTitle: '内装专项',
    description: '水电隐蔽、基层、防水、面层、安装和保洁',
    handbook: '内装分册',
    duration: '约 75 天',
    buildNodes: interiorNodes,
  },
  custom: {
    key: 'custom',
    title: '自定义质量报告',
    shortTitle: '自定义报告',
    description: '非标工程、缺陷巡检、零星工程及其他专项验收',
    handbook: '项目验收标准',
    duration: '按项目计划',
    buildNodes: customNodes,
  },
};

export const STATUS_OPTIONS = [
  { key: 'pending', label: '待检' },
  { key: 'pass', label: '合格' },
  { key: 'rectify', label: '待整改' },
  { key: 'na', label: '不适用' },
];
