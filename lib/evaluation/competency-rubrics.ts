// lib/evaluation/competency-rubrics.ts
// SOTA-Level Structured Competency Rubrics (Meta/Google Style)

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface RubricLevel {
  level: number;           // 1-5
  scoreRange: [number, number];  // Maps to 1-10 scale
  label: {
    zh: string;
    en: string;
  };
  positiveIndicators: {
    zh: string[];
    en: string[];
  };
  negativeIndicators: {
    zh: string[];
    en: string[];
  };
  exampleBehaviors: {
    zh: string[];
    en: string[];
  };
}

export interface CompetencyRubric {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  levels: RubricLevel[];
  keyQuestions: {
    zh: string[];
    en: string[];
  };
}

export interface RubricEvaluationResult {
  competencyId: string;
  competencyName: string;
  level: number;
  score: number;
  evidence: string[];
  matchedIndicators: string[];
  missingIndicators: string[];
  feedback: string;
}

// ============================================
// BEHAVIORAL INTERVIEW RUBRICS
// ============================================

export const BEHAVIORAL_RUBRICS: CompetencyRubric[] = [
  // ==========================================
  // 1. LEADERSHIP (領導力)
  // ==========================================
  {
    id: 'leadership',
    name: {
      zh: '領導力',
      en: 'Leadership',
    },
    description: {
      zh: '主動承擔責任、影響他人、推動變革的能力',
      en: 'Ability to take initiative, influence others, and drive change',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['完全被動', '等待指示', '迴避責任', '無法舉例領導經驗'],
          en: ['Completely passive', 'Waits for instructions', 'Avoids responsibility', 'Cannot provide leadership examples'],
        },
        exampleBehaviors: {
          zh: ['「我都是聽主管的安排」', '「這不是我的職責範圍」'],
          en: ['"I just follow what my manager says"', '"That wasn\'t my responsibility"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['被動接受任務', '完成指派工作', '偶爾提出想法'],
          en: ['Accepts assigned tasks', 'Completes assigned work', 'Occasionally suggests ideas'],
        },
        negativeIndicators: {
          zh: ['缺乏主動性', '需要推動才行動', '很少影響他人'],
          en: ['Lacks initiative', 'Needs pushing to act', 'Rarely influences others'],
        },
        exampleBehaviors: {
          zh: ['「主管交代的我都有做到」', '「我有提過這個想法，但沒有後續」'],
          en: ['"I completed everything my manager assigned"', '"I mentioned this idea but didn\'t follow up"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['主動承擔任務', '提出改進建議', '協調小範圍團隊', '展現責任感'],
          en: ['Takes on tasks proactively', 'Suggests improvements', 'Coordinates small teams', 'Shows responsibility'],
        },
        negativeIndicators: {
          zh: ['影響力有限', '改變範圍較小', '缺乏跨團隊影響'],
          en: ['Limited influence', 'Small scope of change', 'Lacks cross-team impact'],
        },
        exampleBehaviors: {
          zh: ['「我主動提出優化方案並執行」', '「我負責帶領3人完成這個功能」'],
          en: ['"I proactively proposed and implemented an optimization"', '"I led a team of 3 to complete this feature"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['主動發現問題', '影響團隊決策', '帶領較大團隊', '推動跨部門合作', '培養他人'],
          en: ['Proactively identifies problems', 'Influences team decisions', 'Leads larger teams', 'Drives cross-team collaboration', 'Develops others'],
        },
        negativeIndicators: {
          zh: ['尚未達到組織級影響'],
          en: ['Not yet organizational-level impact'],
        },
        exampleBehaviors: {
          zh: ['「我發現流程問題後，說服團隊採用新方案，節省了30%時間」', '「我主導了跨部門的整合專案」'],
          en: ['"After identifying a process issue, I convinced the team to adopt a new approach, saving 30% time"', '"I led a cross-departmental integration project"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['制定團隊/組織方向', '建立團隊文化', '影響組織決策', '培養多位人才', '創造持久改變'],
          en: ['Sets team/org direction', 'Builds team culture', 'Influences org decisions', 'Develops multiple talents', 'Creates lasting change'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我建立了團隊的code review文化，現在已成為公司標準」', '「我培養了3位工程師晉升為tech lead」'],
          en: ['"I established a code review culture that became company standard"', '"I mentored 3 engineers who were promoted to tech lead"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '請描述一次你主動領導團隊的經驗',
        '你如何影響團隊採納你的想法？',
        '描述你培養或指導他人的經驗',
      ],
      en: [
        'Describe a time you proactively led a team',
        'How did you influence your team to adopt your ideas?',
        'Describe your experience mentoring or developing others',
      ],
    },
  },

  // ==========================================
  // 2. TEAMWORK (團隊合作)
  // ==========================================
  {
    id: 'teamwork',
    name: {
      zh: '團隊合作',
      en: 'Teamwork',
    },
    description: {
      zh: '與他人有效協作、支持團隊目標、建立關係的能力',
      en: 'Ability to collaborate effectively, support team goals, and build relationships',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['偏好獨自工作', '不願分享資訊', '與同事關係緊張', '無法舉例合作經驗'],
          en: ['Prefers working alone', 'Unwilling to share info', 'Tense relationships', 'Cannot provide collaboration examples'],
        },
        exampleBehaviors: {
          zh: ['「我比較喜歡自己做」', '「團隊的事我不太清楚」'],
          en: ['"I prefer doing things myself"', '"I\'m not really aware of team matters"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['配合團隊要求', '完成分內工作', '基本溝通'],
          en: ['Cooperates with team requests', 'Completes own work', 'Basic communication'],
        },
        negativeIndicators: {
          zh: ['被動配合', '缺乏主動溝通', '較少幫助他人'],
          en: ['Passive cooperation', 'Lacks proactive communication', 'Rarely helps others'],
        },
        exampleBehaviors: {
          zh: ['「團隊需要的時候我會配合」', '「我有完成我負責的部分」'],
          en: ['"I cooperate when the team needs me"', '"I completed my part"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['主動分享資訊', '支持隊友', '有效溝通', '參與團隊討論'],
          en: ['Proactively shares info', 'Supports teammates', 'Communicates effectively', 'Participates in discussions'],
        },
        negativeIndicators: {
          zh: ['跨團隊合作較少', '衝突處理經驗有限'],
          en: ['Limited cross-team collaboration', 'Limited conflict resolution experience'],
        },
        exampleBehaviors: {
          zh: ['「我主動跟前端同步進度，避免整合問題」', '「同事卡關時我會主動幫忙」'],
          en: ['"I proactively synced with frontend to avoid integration issues"', '"I helped colleagues when they were stuck"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['促進團隊協作', '解決團隊衝突', '建立信任關係', '跨部門合作', '提升團隊效能'],
          en: ['Facilitates collaboration', 'Resolves conflicts', 'Builds trust', 'Cross-team collaboration', 'Improves team efficiency'],
        },
        negativeIndicators: {
          zh: ['尚未建立團隊文化'],
          en: ['Not yet building team culture'],
        },
        exampleBehaviors: {
          zh: ['「兩位同事有分歧時，我協調找出雙方都能接受的方案」', '「我建立了跨團隊的定期同步會議」'],
          en: ['"When two colleagues disagreed, I mediated to find a mutually acceptable solution"', '"I established regular cross-team sync meetings"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['塑造團隊文化', '建立協作機制', '跨組織影響', '培養團隊凝聚力', '創造高效團隊環境'],
          en: ['Shapes team culture', 'Establishes collaboration mechanisms', 'Cross-org influence', 'Builds team cohesion', 'Creates high-performing environment'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我建立了團隊的知識分享文化，每週tech talk已持續一年」', '「我推動的協作流程被其他團隊採用」'],
          en: ['"I built a knowledge-sharing culture with weekly tech talks running for a year"', '"The collaboration process I promoted was adopted by other teams"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述一次你與團隊成功合作的經驗',
        '你如何處理團隊中的不同意見？',
        '描述一次跨部門合作的經驗',
      ],
      en: [
        'Describe a successful team collaboration',
        'How do you handle differing opinions in a team?',
        'Describe a cross-departmental collaboration',
      ],
    },
  },

  // ==========================================
  // 3. PROBLEM SOLVING (問題解決)
  // ==========================================
  {
    id: 'problem-solving',
    name: {
      zh: '問題解決',
      en: 'Problem Solving',
    },
    description: {
      zh: '分析問題、找出根因、提出有效解決方案的能力',
      en: 'Ability to analyze problems, identify root causes, and propose effective solutions',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['無法描述問題', '沒有分析過程', '依賴他人解決', '無法舉例'],
          en: ['Cannot describe problems', 'No analysis process', 'Relies on others', 'Cannot provide examples'],
        },
        exampleBehaviors: {
          zh: ['「遇到問題我會問主管」', '「我不太記得怎麼解決的」'],
          en: ['"I ask my manager when I encounter problems"', '"I don\'t really remember how it was solved"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['能描述問題', '嘗試解決', '使用基本方法'],
          en: ['Can describe problems', 'Attempts solutions', 'Uses basic methods'],
        },
        negativeIndicators: {
          zh: ['分析不深入', '缺乏系統性', '解決方案較簡單'],
          en: ['Shallow analysis', 'Lacks systematic approach', 'Simple solutions'],
        },
        exampleBehaviors: {
          zh: ['「我Google了一下然後試了幾個方法」', '「我發現問題後就修復了」'],
          en: ['"I Googled and tried a few methods"', '"I found the issue and fixed it"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['系統性分析', '找出根因', '提出有效方案', '驗證結果'],
          en: ['Systematic analysis', 'Identifies root cause', 'Proposes effective solutions', 'Validates results'],
        },
        negativeIndicators: {
          zh: ['複雜問題處理較少', '預防措施有限'],
          en: ['Limited complex problem experience', 'Limited preventive measures'],
        },
        exampleBehaviors: {
          zh: ['「我用排除法找到根因是資料庫連接池耗盡」', '「我分析了日誌，發現問題在第三方API超時」'],
          en: ['"I used elimination to find the root cause was database connection pool exhaustion"', '"I analyzed logs and found the issue was third-party API timeout"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['處理複雜問題', '創新解決方案', '建立預防機制', '量化改善成果', '分享解決方法'],
          en: ['Handles complex problems', 'Innovative solutions', 'Establishes prevention', 'Quantifies improvements', 'Shares solutions'],
        },
        negativeIndicators: {
          zh: ['尚未建立系統性流程'],
          en: ['Not yet systematic processes'],
        },
        exampleBehaviors: {
          zh: ['「我設計了自動化監控，問題發生前就預警，減少了80%的incident」', '「我把解決方案文檔化，之後團隊都能快速處理類似問題」'],
          en: ['"I designed automated monitoring that alerts before issues occur, reducing incidents by 80%"', '"I documented the solution so the team can quickly handle similar issues"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['解決系統性問題', '建立問題解決文化', '創造可複用框架', '影響組織方法論', '預防重大風險'],
          en: ['Solves systemic problems', 'Builds problem-solving culture', 'Creates reusable frameworks', 'Influences org methodology', 'Prevents major risks'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我建立了incident response流程，現在是全公司標準」', '「我設計的troubleshooting框架讓平均解決時間從4小時降到30分鐘」'],
          en: ['"I established an incident response process now used company-wide"', '"The troubleshooting framework I designed reduced average resolution time from 4 hours to 30 minutes"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述一個你解決的複雜技術問題',
        '你如何分析問題的根本原因？',
        '描述一次你預防問題發生的經驗',
      ],
      en: [
        'Describe a complex technical problem you solved',
        'How do you analyze root causes?',
        'Describe a time you prevented a problem from occurring',
      ],
    },
  },

  // ==========================================
  // 4. COMMUNICATION (溝通能力)
  // ==========================================
  {
    id: 'communication',
    name: {
      zh: '溝通能力',
      en: 'Communication',
    },
    description: {
      zh: '清楚表達想法、有效傾聽、適應不同受眾的能力',
      en: 'Ability to express ideas clearly, listen effectively, and adapt to different audiences',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['表達不清', '邏輯混亂', '無法回答問題', '答非所問'],
          en: ['Unclear expression', 'Confused logic', 'Cannot answer questions', 'Off-topic responses'],
        },
        exampleBehaviors: {
          zh: ['回答跳躍、難以理解', '無法簡單解釋自己的工作'],
          en: ['Jumpy answers, hard to understand', 'Cannot simply explain their work'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['能回答問題', '基本邏輯', '能表達想法'],
          en: ['Can answer questions', 'Basic logic', 'Can express ideas'],
        },
        negativeIndicators: {
          zh: ['不夠簡潔', '缺乏結構', '細節不足或過多'],
          en: ['Not concise', 'Lacks structure', 'Too little or too much detail'],
        },
        exampleBehaviors: {
          zh: ['回答較長但重點不明確', '需要追問才能得到關鍵資訊'],
          en: ['Long answers but unclear main points', 'Needs follow-up to get key info'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['清晰表達', '有結構', '適當細節', '能回應追問'],
          en: ['Clear expression', 'Structured', 'Appropriate detail', 'Responds to follow-ups'],
        },
        negativeIndicators: {
          zh: ['對不同受眾調整較少', '說服力有限'],
          en: ['Limited audience adaptation', 'Limited persuasiveness'],
        },
        exampleBehaviors: {
          zh: ['使用STAR結構回答', '能清楚解釋技術概念'],
          en: ['Uses STAR structure', 'Can clearly explain technical concepts'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['根據受眾調整', '有說服力', '善用例子', '處理困難對話', '主動確認理解'],
          en: ['Adapts to audience', 'Persuasive', 'Uses examples well', 'Handles difficult conversations', 'Confirms understanding'],
        },
        negativeIndicators: {
          zh: ['高層溝通經驗較少'],
          en: ['Limited executive communication'],
        },
        exampleBehaviors: {
          zh: ['「跟PM我用業務價值說明，跟工程師我用技術細節」', '「我用類比讓非技術主管理解系統架構」'],
          en: ['"With PM I explain business value, with engineers I use technical details"', '"I used analogies to help non-technical managers understand the architecture"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['影響高層決策', '處理敏感議題', '建立溝通機制', '跨文化溝通', '公開演講能力'],
          en: ['Influences executive decisions', 'Handles sensitive issues', 'Establishes communication mechanisms', 'Cross-cultural communication', 'Public speaking ability'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我向CEO簡報技術策略，成功爭取到額外預算」', '「我建立了團隊的RFC流程，提升了技術決策的透明度」'],
          en: ['"I presented tech strategy to the CEO and secured additional budget"', '"I established an RFC process that improved technical decision transparency"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述一次你說服他人的經驗',
        '你如何向非技術人員解釋技術概念？',
        '描述一次困難的溝通經驗',
      ],
      en: [
        'Describe a time you persuaded others',
        'How do you explain technical concepts to non-technical people?',
        'Describe a difficult communication experience',
      ],
    },
  },

  // ==========================================
  // 5. PRESSURE HANDLING (壓力處理)
  // ==========================================
  {
    id: 'pressure',
    name: {
      zh: '壓力處理',
      en: 'Handling Pressure',
    },
    description: {
      zh: '在壓力下保持冷靜、有效處理緊急狀況的能力',
      en: 'Ability to stay calm under pressure and handle urgent situations effectively',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['逃避壓力情境', '無法舉例', '表現出明顯焦慮', '無應對策略'],
          en: ['Avoids pressure situations', 'Cannot provide examples', 'Shows obvious anxiety', 'No coping strategies'],
        },
        exampleBehaviors: {
          zh: ['「我盡量避免這種情況」', '「壓力大的時候我會很緊張」'],
          en: ['"I try to avoid such situations"', '"I get very nervous under pressure"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['能完成任務', '基本應對', '事後恢復'],
          en: ['Can complete tasks', 'Basic coping', 'Recovers afterward'],
        },
        negativeIndicators: {
          zh: ['過程較掙扎', '效率下降', '需要支援'],
          en: ['Struggles through', 'Reduced efficiency', 'Needs support'],
        },
        exampleBehaviors: {
          zh: ['「雖然很趕，但最後還是完成了」', '「那時候很累，但撐過去了」'],
          en: ['"It was rushed but I finished"', '"It was exhausting but I got through it"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['保持冷靜', '有優先順序', '按時完成', '有應對方法'],
          en: ['Stays calm', 'Prioritizes', 'Delivers on time', 'Has coping methods'],
        },
        negativeIndicators: {
          zh: ['長期高壓較少經驗', '幫助他人較少'],
          en: ['Less experience with prolonged pressure', 'Less helping others'],
        },
        exampleBehaviors: {
          zh: ['「我先列出優先順序，專注最重要的任務」', '「我把大任務拆小，一步步完成」'],
          en: ['"I listed priorities and focused on the most important tasks"', '"I broke big tasks into smaller steps"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['高壓下高效', '帶領團隊度過危機', '有系統性方法', '事後改進流程', '量化成果'],
          en: ['Efficient under high pressure', 'Leads team through crisis', 'Systematic approach', 'Improves processes afterward', 'Quantifies results'],
        },
        negativeIndicators: {
          zh: ['尚未建立組織級應對機制'],
          en: ['Not yet organizational crisis mechanisms'],
        },
        exampleBehaviors: {
          zh: ['「線上出問題時，我冷靜地協調團隊，2小時內修復，並建立了監控防止再發」', '「連續趕專案3週，我每天站會確保團隊狀態，最後準時上線」'],
          en: ['"When production broke, I calmly coordinated the team, fixed it in 2 hours, and set up monitoring to prevent recurrence"', '"During a 3-week crunch, I held daily standups to ensure team health and we launched on time"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['建立危機處理機制', '預防壓力情境', '培養團隊韌性', '在極端情況下領導', '創造從容的工作環境'],
          en: ['Establishes crisis management', 'Prevents pressure situations', 'Builds team resilience', 'Leads in extreme situations', 'Creates calm work environment'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我建立了on-call輪值和incident response流程，讓團隊能從容應對緊急狀況」', '「我推動了realistic估時文化，減少了70%的deadline壓力」'],
          en: ['"I established on-call rotation and incident response, enabling calm crisis handling"', '"I promoted realistic estimation culture, reducing deadline pressure by 70%"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述一次你在緊迫deadline下完成工作的經驗',
        '你如何處理工作中的壓力？',
        '描述一次你處理緊急狀況的經驗',
      ],
      en: [
        'Describe completing work under a tight deadline',
        'How do you handle work pressure?',
        'Describe handling an emergency situation',
      ],
    },
  },

  // ==========================================
  // 6. CONFLICT RESOLUTION (衝突處理)
  // ==========================================
  {
    id: 'conflict-resolution',
    name: {
      zh: '衝突處理',
      en: 'Conflict Resolution',
    },
    description: {
      zh: '有效處理分歧、找到共識、維護關係的能力',
      en: 'Ability to handle disagreements, find consensus, and maintain relationships',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['逃避衝突', '無法舉例', '衝突升級', '關係受損'],
          en: ['Avoids conflict', 'Cannot provide examples', 'Escalates conflicts', 'Damages relationships'],
        },
        exampleBehaviors: {
          zh: ['「我通常不會有衝突」', '「有意見不同我就不說了」'],
          en: ['"I usually don\'t have conflicts"', '"If there\'s disagreement I just stay quiet"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['能面對衝突', '尋求幫助', '基本解決'],
          en: ['Can face conflicts', 'Seeks help', 'Basic resolution'],
        },
        negativeIndicators: {
          zh: ['需要他人介入', '解決不徹底', '較被動'],
          en: ['Needs intervention', 'Incomplete resolution', 'Relatively passive'],
        },
        exampleBehaviors: {
          zh: ['「我們意見不同，後來請主管協調」', '「最後各退一步」'],
          en: ['"We disagreed and asked our manager to mediate"', '"We each compromised in the end"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['主動處理', '理解對方立場', '找到解決方案', '維護關係'],
          en: ['Handles proactively', 'Understands other perspectives', 'Finds solutions', 'Maintains relationships'],
        },
        negativeIndicators: {
          zh: ['複雜衝突經驗較少', '跨團隊衝突較少'],
          en: ['Less complex conflict experience', 'Less cross-team conflict'],
        },
        exampleBehaviors: {
          zh: ['「我先聽對方的想法，理解他的顧慮後，提出雙方都能接受的方案」', '「我私下找他聊，了解真正的問題是什麼」'],
          en: ['"I listened to their concerns first, then proposed a mutually acceptable solution"', '"I talked to them privately to understand the real issue"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['處理複雜衝突', '促進雙贏', '建立共識', '跨團隊協調', '預防衝突'],
          en: ['Handles complex conflicts', 'Creates win-win', 'Builds consensus', 'Cross-team coordination', 'Prevents conflicts'],
        },
        negativeIndicators: {
          zh: ['組織級衝突較少'],
          en: ['Less organizational conflict experience'],
        },
        exampleBehaviors: {
          zh: ['「前後端對架構有很大分歧，我組織了workshop讓大家把顧慮攤開，最後達成共識」', '「我在專案初期就建立了決策機制，避免後期衝突」'],
          en: ['"Frontend and backend disagreed on architecture, I organized a workshop to air concerns and reached consensus"', '"I established decision mechanisms early to prevent later conflicts"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['解決組織級衝突', '建立衝突處理文化', '轉化衝突為創新', '處理敏感人事議題', '建立長期和諧'],
          en: ['Resolves org-level conflicts', 'Builds conflict resolution culture', 'Turns conflict into innovation', 'Handles sensitive people issues', 'Builds long-term harmony'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「兩個部門長期不合作，我設計了共同KPI讓他們有合作誘因，現在是公司協作最好的兩個團隊」'],
          en: ['"Two departments had long-standing friction, I designed shared KPIs to incentivize cooperation, now they\'re the most collaborative teams"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述一次你與同事意見不同的經驗',
        '你如何處理團隊中的分歧？',
        '描述一次你化解衝突的經驗',
      ],
      en: [
        'Describe a disagreement with a colleague',
        'How do you handle team disagreements?',
        'Describe resolving a conflict',
      ],
    },
  },

  // ==========================================
  // 7. ADAPTABILITY (適應力)
  // ==========================================
  {
    id: 'adaptability',
    name: {
      zh: '適應力',
      en: 'Adaptability',
    },
    description: {
      zh: '面對變化時快速調整、學習新事物的能力',
      en: 'Ability to adjust quickly to changes and learn new things',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['抗拒變化', '無法舉例', '固守舊方法', '學習緩慢'],
          en: ['Resists change', 'Cannot provide examples', 'Sticks to old ways', 'Slow learner'],
        },
        exampleBehaviors: {
          zh: ['「我比較習慣原來的做法」', '「變動太多我會不適應」'],
          en: ['"I prefer the old way"', '"Too many changes make me uncomfortable"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['接受變化', '能夠學習', '逐漸適應'],
          en: ['Accepts changes', 'Can learn', 'Gradually adapts'],
        },
        negativeIndicators: {
          zh: ['適應較慢', '需要支援', '被動調整'],
          en: ['Slow to adapt', 'Needs support', 'Passive adjustment'],
        },
        exampleBehaviors: {
          zh: ['「公司換了新系統，我花了一段時間才習慣」', '「主管要求改做法，我就跟著調整」'],
          en: ['"The company changed systems and it took me a while to get used to it"', '"My manager asked to change approach and I followed"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['主動適應', '快速學習', '彈性調整', '正面態度'],
          en: ['Adapts proactively', 'Learns quickly', 'Flexibly adjusts', 'Positive attitude'],
        },
        negativeIndicators: {
          zh: ['重大變革經驗較少', '幫助他人適應較少'],
          en: ['Less major change experience', 'Less helping others adapt'],
        },
        exampleBehaviors: {
          zh: ['「團隊轉用新框架，我主動學習並在兩週內上手」', '「需求突然改變，我快速調整計畫重新排優先順序」'],
          en: ['"Team switched to a new framework, I proactively learned and was proficient in two weeks"', '"Requirements suddenly changed, I quickly reprioritized"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['引領變革', '幫助他人適應', '在變動中表現出色', '預見並準備變化', '從變化中找機會'],
          en: ['Leads change', 'Helps others adapt', 'Excels during change', 'Anticipates and prepares', 'Finds opportunities in change'],
        },
        negativeIndicators: {
          zh: ['組織級變革經驗較少'],
          en: ['Less org-level transformation'],
        },
        exampleBehaviors: {
          zh: ['「公司重組時，我主動承擔新職責並幫助團隊成員適應」', '「技術遷移期間，我建立了learning group幫大家一起成長」'],
          en: ['"During reorg, I took on new responsibilities and helped teammates adapt"', '"During tech migration, I created a learning group to grow together"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['推動組織變革', '建立學習文化', '在極端不確定中領導', '創造適應性組織', '將變化轉為競爭優勢'],
          en: ['Drives org transformation', 'Builds learning culture', 'Leads in extreme uncertainty', 'Creates adaptive organization', 'Turns change into competitive advantage'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我主導了團隊從monolith到microservice的轉型，建立了持續學習的文化」', '「疫情期間，我帶領團隊3天內完成遠端工作轉型，效率還提升了20%」'],
          en: ['"I led the monolith-to-microservice transformation and built a continuous learning culture"', '"During COVID, I led the team to remote work in 3 days with 20% efficiency improvement"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述一次你需要快速學習新技能的經驗',
        '你如何應對工作中的重大變化？',
        '描述一次計畫突然改變時你如何處理',
      ],
      en: [
        'Describe rapidly learning a new skill',
        'How do you handle major changes at work?',
        'Describe handling a sudden plan change',
      ],
    },
  },

  // ==========================================
  // 8. ACHIEVEMENT ORIENTATION (成就導向)
  // ==========================================
  {
    id: 'achievement',
    name: {
      zh: '成就導向',
      en: 'Achievement Orientation',
    },
    description: {
      zh: '設定目標、追求卓越、展現成果的能力',
      en: 'Ability to set goals, pursue excellence, and demonstrate results',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['無法舉例成就', '無目標意識', '成果模糊', '缺乏主動性'],
          en: ['Cannot provide achievements', 'No goal awareness', 'Vague results', 'Lacks initiative'],
        },
        exampleBehaviors: {
          zh: ['「我就是做好本分的工作」', '「沒有特別的成就」'],
          en: ['"I just do my job"', '"No particular achievements"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['完成工作', '達到基本要求', '有一些成果'],
          en: ['Completes work', 'Meets basic requirements', 'Some results'],
        },
        negativeIndicators: {
          zh: ['缺乏量化', '範圍有限', '被動達成'],
          en: ['Lacks quantification', 'Limited scope', 'Passive achievement'],
        },
        exampleBehaviors: {
          zh: ['「我完成了主管交代的任務」', '「專案有按時上線」'],
          en: ['"I completed tasks assigned by my manager"', '"The project launched on time"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['主動設定目標', '超越基本要求', '有量化成果', '持續改進'],
          en: ['Sets goals proactively', 'Exceeds basic requirements', 'Quantified results', 'Continuous improvement'],
        },
        negativeIndicators: {
          zh: ['影響範圍有限', '重大成就較少'],
          en: ['Limited impact scope', 'Fewer major achievements'],
        },
        exampleBehaviors: {
          zh: ['「我優化了API效能，回應時間從500ms降到100ms」', '「我主動提出並實現了新功能，用戶好評率提升15%」'],
          en: ['"I optimized API performance from 500ms to 100ms response time"', '"I proposed and implemented a new feature, improving user ratings by 15%"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['設定挑戰性目標', '超額達成', '顯著業務影響', '量化重大成果', '獲得認可'],
          en: ['Sets challenging goals', 'Exceeds targets', 'Significant business impact', 'Quantified major results', 'Gains recognition'],
        },
        negativeIndicators: {
          zh: ['組織級影響較少'],
          en: ['Less organization-level impact'],
        },
        exampleBehaviors: {
          zh: ['「我帶領團隊完成核心系統重構，處理能力提升10倍，支撐了業務3倍成長」', '「我主導的專案為公司節省了300萬成本，獲得年度最佳專案獎」'],
          en: ['"I led core system refactoring, improving capacity 10x to support 3x business growth"', '"My project saved $3M and won best project of the year"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['設定行業標杆', '創造突破性成果', '組織級影響', '獲得外部認可', '創造持久價值'],
          en: ['Sets industry benchmarks', 'Creates breakthrough results', 'Organization-level impact', 'External recognition', 'Creates lasting value'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我設計的架構成為公司技術標準，並被寫入公司技術白皮書對外分享」', '「我主導的產品線從0到1，現在佔公司營收30%」'],
          en: ['"My architecture became company standard and was shared in our public tech whitepaper"', '"I led a product line from 0 to 1, now 30% of company revenue"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述你最自豪的工作成就',
        '你如何設定和追求目標？',
        '描述一次你超越期望的經驗',
      ],
      en: [
        'Describe your proudest work achievement',
        'How do you set and pursue goals?',
        'Describe exceeding expectations',
      ],
    },
  },

  // ==========================================
  // 9. LEARNING ABILITY (學習能力)
  // ==========================================
  {
    id: 'learning',
    name: {
      zh: '學習能力',
      en: 'Learning Ability',
    },
    description: {
      zh: '從經驗中學習、快速掌握新知識的能力',
      en: 'Ability to learn from experience and quickly acquire new knowledge',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['無學習意識', '無法舉例', '重複錯誤', '不願學新東西'],
          en: ['No learning awareness', 'Cannot provide examples', 'Repeats mistakes', 'Unwilling to learn new things'],
        },
        exampleBehaviors: {
          zh: ['「工作用到什麼就學什麼」', '「我用熟悉的方法就好」'],
          en: ['"I learn whatever is needed for work"', '"I\'ll stick with what I know"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['能學習', '完成必要學習', '從錯誤中調整'],
          en: ['Can learn', 'Completes necessary learning', 'Adjusts from mistakes'],
        },
        negativeIndicators: {
          zh: ['被動學習', '範圍有限', '深度不足'],
          en: ['Passive learning', 'Limited scope', 'Lacks depth'],
        },
        exampleBehaviors: {
          zh: ['「專案需要用到新技術，我就去學了」', '「犯錯後我下次會注意」'],
          en: ['"The project needed new tech so I learned it"', '"I\'ll be careful next time after making a mistake"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['主動學習', '快速上手', '反思改進', '應用所學'],
          en: ['Learns proactively', 'Quick to proficiency', 'Reflects and improves', 'Applies learning'],
        },
        negativeIndicators: {
          zh: ['分享較少', '系統性不足'],
          en: ['Less sharing', 'Less systematic'],
        },
        exampleBehaviors: {
          zh: ['「我每週花時間學習新技術，最近在研究Kubernetes」', '「專案結束後我做了retrospective，記錄了學到的經驗」'],
          en: ['"I spend time weekly learning new tech, currently studying Kubernetes"', '"After the project, I did a retrospective documenting lessons learned"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['系統性學習', '深度掌握', '分享所學', '將失敗轉為學習', '建立知識體系'],
          en: ['Systematic learning', 'Deep mastery', 'Shares learning', 'Turns failures into learning', 'Builds knowledge systems'],
        },
        negativeIndicators: {
          zh: ['組織級學習文化較少'],
          en: ['Less org-level learning culture'],
        },
        exampleBehaviors: {
          zh: ['「那次失敗後，我深入分析原因並寫成文章分享給團隊，避免大家重蹈覆轍」', '「我建立了個人的技術learning roadmap，每季review進度」'],
          en: ['"After that failure, I analyzed root causes and shared an article with the team to prevent repeats"', '"I built a personal tech learning roadmap and review progress quarterly"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['建立學習文化', '培養他人學習', '創造知識資產', '引領技術趨勢', '將學習制度化'],
          en: ['Builds learning culture', 'Develops others\' learning', 'Creates knowledge assets', 'Leads tech trends', 'Institutionalizes learning'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我建立了團隊的tech talk文化，累積了50+篇內部技術文章」', '「我設計的onboarding learning path讓新人上手時間從3個月縮短到1個月」'],
          en: ['"I built a tech talk culture with 50+ internal articles"', '"My onboarding learning path reduced ramp-up from 3 months to 1 month"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述你最近學習的新技能',
        '你如何從失敗中學習？',
        '描述你如何幫助他人學習成長',
      ],
      en: [
        'Describe a new skill you recently learned',
        'How do you learn from failures?',
        'Describe helping others learn and grow',
      ],
    },
  },

  // ==========================================
  // 10. OWNERSHIP (當責)
  // ==========================================
  {
    id: 'ownership',
    name: {
      zh: '當責',
      en: 'Ownership',
    },
    description: {
      zh: '對工作負責到底、不推卸責任的態度',
      en: 'Taking full responsibility for work without passing blame',
    },
    levels: [
      {
        level: 1,
        scoreRange: [1, 2],
        label: { zh: '不足', en: 'Insufficient' },
        positiveIndicators: {
          zh: [],
          en: [],
        },
        negativeIndicators: {
          zh: ['推卸責任', '怪罪他人', '只做份內事', '遇問題就停'],
          en: ['Shifts blame', 'Blames others', 'Only does own tasks', 'Stops at problems'],
        },
        exampleBehaviors: {
          zh: ['「那是別的team的問題」', '「這不是我負責的範圍」'],
          en: ['"That\'s another team\'s problem"', '"That\'s not my responsibility"'],
        },
      },
      {
        level: 2,
        scoreRange: [3, 4],
        label: { zh: '基本', en: 'Basic' },
        positiveIndicators: {
          zh: ['完成自己的工作', '不推諉', '基本負責'],
          en: ['Completes own work', 'Doesn\'t deflect', 'Basic responsibility'],
        },
        negativeIndicators: {
          zh: ['範圍有限', '遇困難會停', '不主動擴展'],
          en: ['Limited scope', 'Stops at difficulties', 'Doesn\'t proactively expand'],
        },
        exampleBehaviors: {
          zh: ['「我負責的部分有做好」', '「遇到問題我會跟主管報告」'],
          en: ['"I did my part well"', '"I report problems to my manager"'],
        },
      },
      {
        level: 3,
        scoreRange: [5, 6],
        label: { zh: '合格', en: 'Competent' },
        positiveIndicators: {
          zh: ['主動解決問題', '不等指示', '為結果負責', '持續追蹤'],
          en: ['Solves problems proactively', 'Doesn\'t wait for instructions', 'Responsible for outcomes', 'Follows through'],
        },
        negativeIndicators: {
          zh: ['跨團隊當責較少', '影響範圍有限'],
          en: ['Less cross-team ownership', 'Limited scope of influence'],
        },
        exampleBehaviors: {
          zh: ['「發現bug後，我主動修復並確認沒有其他影響」', '「雖然是別team的API，但為了專案進度我主動幫忙debug」'],
          en: ['"After finding a bug, I proactively fixed it and verified no other impact"', '"Though it was another team\'s API, I proactively helped debug for project progress"'],
        },
      },
      {
        level: 4,
        scoreRange: [7, 8],
        label: { zh: '優秀', en: 'Strong' },
        positiveIndicators: {
          zh: ['端到端負責', '跨越職責邊界', '承擔失敗責任', '推動問題解決', '確保最終結果'],
          en: ['End-to-end ownership', 'Crosses role boundaries', 'Takes responsibility for failures', 'Drives problem resolution', 'Ensures final outcomes'],
        },
        negativeIndicators: {
          zh: ['組織級當責較少'],
          en: ['Less org-level ownership'],
        },
        exampleBehaviors: {
          zh: ['「上線後出問題，雖然是運維的疏失，但我主動承擔責任協調修復」', '「專案卡在法務審核，我主動協調各方加速流程」'],
          en: ['"When issues arose post-launch, though it was ops\' oversight, I took responsibility and coordinated the fix"', '"When the project was stuck in legal review, I proactively coordinated all parties to expedite"'],
        },
      },
      {
        level: 5,
        scoreRange: [9, 10],
        label: { zh: '卓越', en: 'Exceptional' },
        positiveIndicators: {
          zh: ['建立當責文化', '為組織結果負責', '預防性解決問題', '創造問責機制', '影響組織行為'],
          en: ['Builds ownership culture', 'Takes org-level responsibility', 'Prevents problems proactively', 'Creates accountability mechanisms', 'Influences org behavior'],
        },
        negativeIndicators: {
          zh: [],
          en: [],
        },
        exampleBehaviors: {
          zh: ['「我建立了專案ownership matrix，讓每個關鍵決策都有明確負責人」', '「雖然是公司級的技術債，我主動發起tech debt清償計畫並推動執行」'],
          en: ['"I built a project ownership matrix ensuring clear owners for every key decision"', '"Though it was company-level tech debt, I initiated and drove a tech debt repayment plan"'],
        },
      },
    ],
    keyQuestions: {
      zh: [
        '描述一次你主動承擔額外責任的經驗',
        '描述一次專案失敗時你如何處理',
        '你如何確保專案最終成功交付？',
      ],
      en: [
        'Describe taking on extra responsibility',
        'Describe handling a project failure',
        'How do you ensure project success?',
      ],
    },
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all competency IDs
 */
export function getAllCompetencyIds(): string[] {
  return BEHAVIORAL_RUBRICS.map(r => r.id);
}

/**
 * Get rubric by competency ID
 */
export function getRubricById(competencyId: string): CompetencyRubric | undefined {
  return BEHAVIORAL_RUBRICS.find(r => r.id === competencyId);
}

/**
 * Get level description by score
 */
export function getLevelByScore(competencyId: string, score: number, language: 'zh' | 'en' = 'zh'): RubricLevel | undefined {
  const rubric = getRubricById(competencyId);
  if (!rubric) return undefined;
  
  return rubric.levels.find(level => 
    score >= level.scoreRange[0] && score <= level.scoreRange[1]
  );
}

/**
 * Format rubric for LLM prompt
 */
export function formatRubricForPrompt(competencyId: string, language: 'zh' | 'en' = 'zh'): string {
  const rubric = getRubricById(competencyId);
  if (!rubric) return '';
  
  const lang = language === 'zh' ? 'zh' : 'en';
  
  let output = `【${rubric.name[lang]}】\n`;
  output += `${rubric.description[lang]}\n\n`;
  
  rubric.levels.forEach(level => {
    output += `Level ${level.level} (${level.scoreRange[0]}-${level.scoreRange[1]}分) - ${level.label[lang]}:\n`;
    
    if (level.positiveIndicators[lang].length > 0) {
      output += `  ✓ 正面指標: ${level.positiveIndicators[lang].join(', ')}\n`;
    }
    if (level.negativeIndicators[lang].length > 0) {
      output += `  ✗ 負面指標: ${level.negativeIndicators[lang].join(', ')}\n`;
    }
    if (level.exampleBehaviors[lang].length > 0) {
      output += `  例子: ${level.exampleBehaviors[lang][0]}\n`;
    }
    output += '\n';
  });
  
  return output;
}

/**
 * Format all rubrics for comprehensive evaluation prompt
 */
export function formatAllRubricsForPrompt(language: 'zh' | 'en' = 'zh'): string {
  return BEHAVIORAL_RUBRICS.map(rubric => formatRubricForPrompt(rubric.id, language)).join('\n---\n\n');
}

/**
 * Get competencies that should be evaluated based on interview type
 */
export function getCompetenciesForInterviewType(interviewType: string): string[] {
  switch (interviewType) {
    case 'behavioral':
      return ['leadership', 'teamwork', 'problem-solving', 'communication', 'pressure', 'conflict-resolution', 'adaptability', 'achievement', 'learning', 'ownership'];
    case 'technical':
      return ['problem-solving', 'communication', 'learning', 'ownership', 'adaptability'];
    case 'system-design':
      return ['problem-solving', 'communication', 'leadership', 'ownership'];
    case 'case-study':
      return ['problem-solving', 'communication', 'achievement', 'adaptability'];
    default:
      return ['leadership', 'teamwork', 'problem-solving', 'communication', 'ownership'];
  }
}