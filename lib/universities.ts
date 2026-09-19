import { University } from '@/types'

export const UNIVERSITIES: University[] = [
  // USA
  { name: 'MIT', country: 'USA', flag: '🇺🇸', program: 'EECS SM / PhD', fit_score: 9.2, chance: 78, route: 'professor', notes: 'Target: Dina Katabi (CSAIL), Rosalind Picard (Media Lab), Collin Stultz (RLE+HMS)' },
  { name: 'Stanford', country: 'USA', flag: '🇺🇸', program: 'MS EE / PhD (HAI)', fit_score: 9.0, chance: 72, route: 'professor', notes: 'Target: James Zou (HAI), Euan Ashley (cardiac), Serena Yeung (clinical AI)' },
  { name: 'Harvard', country: 'USA', flag: '🇺🇸', program: 'HMS Biomedical Informatics', fit_score: 8.8, chance: 70, route: 'professor', notes: 'Target: Zak Kohane (HMS), Finale Doshi-Velez (SEAS)' },
  { name: 'Yale', country: 'USA', flag: '🇺🇸', program: 'Biomedical Engineering', fit_score: 8.5, chance: 75, route: 'professor', notes: 'Strong BME program, less competitive than MIT/Stanford' },
  { name: 'Cornell Tech', country: 'USA', flag: '🇺🇸', program: 'MEng / MS ECE', fit_score: 9.5, chance: 90, route: 'both', notes: 'NYC location, BEST Ivy fit — founder + CTO = their ideal profile' },
  { name: 'CMU', country: 'USA', flag: '🇺🇸', program: 'MSML / MRSD Robotics', fit_score: 9.3, chance: 85, route: 'both', notes: 'Target: Artur Dubrawski (Auton Lab clinical AI)' },
  { name: 'Columbia', country: 'USA', flag: '🇺🇸', program: 'MS Biomedical Engineering', fit_score: 9.1, chance: 88, route: 'both', notes: 'PULSE AI + ClinCell = textbook Columbia BME profile' },
  { name: 'Johns Hopkins', country: 'USA', flag: '🇺🇸', program: 'BME / CS', fit_score: 8.8, chance: 80, route: 'professor', notes: 'World leader in biomedical engineering, strong clinical AI' },
  { name: 'Georgia Tech', country: 'USA', flag: '🇺🇸', program: 'MSECE / OMSCS ($7k online)', fit_score: 9.2, chance: 92, route: 'direct', notes: 'HIGHEST PROBABILITY + OMSCS lets you work at NVIDIA while studying' },
  { name: 'UC San Diego', country: 'USA', flag: '🇺🇸', program: 'Bioengineering AI', fit_score: 8.6, chance: 82, route: 'professor', notes: 'Strong wearables and biosignal research' },
  // Canada
  { name: 'U Toronto — Vector Institute', country: 'Canada', flag: '🇨🇦', program: 'AI / ML Research', fit_score: 9.4, chance: 97, route: 'both', notes: 'World top AI institute, easier visa than USA, Target: Frank Rudzicz' },
  { name: 'University of Waterloo', country: 'Canada', flag: '🇨🇦', program: 'AI Institute', fit_score: 9.2, chance: 90, route: 'both', notes: 'Strong industry-research bridge, CTO profile valued' },
  { name: 'McGill', country: 'Canada', flag: '🇨🇦', program: 'Biomedical Engineering', fit_score: 8.9, chance: 93, route: 'direct', notes: 'Strong Pakistan alumni, clinical AI focus' },
  { name: 'UBC', country: 'Canada', flag: '🇨🇦', program: 'EE + Biomedical', fit_score: 8.5, chance: 88, route: 'direct', notes: 'Vancouver, strong tech industry connections' },
  // Germany (FREE tuition)
  { name: 'TU Munich', country: 'Germany', flag: '🇩🇪', program: 'MSc EE — FREE tuition', fit_score: 9.6, chance: 98, route: 'direct', notes: 'FREE. #1 European engineering uni. Siemens/BMW directly connected. Your X-Pact experience matters here.' },
  { name: 'KIT Karlsruhe', country: 'Germany', flag: '🇩🇪', program: 'EE + AI — FREE tuition', fit_score: 9.4, chance: 95, route: 'direct', notes: 'FREE. Top engineering program. Siemens ecosystem.' },
  { name: 'Heidelberg University', country: 'Germany', flag: '🇩🇪', program: 'Medical Informatics — FREE', fit_score: 9.0, chance: 90, route: 'professor', notes: 'FREE. PULSE AI maps directly to their clinical informatics research.' },
  { name: 'RWTH Aachen', country: 'Germany', flag: '🇩🇪', program: 'Electrical Engineering — FREE', fit_score: 9.2, chance: 95, route: 'direct', notes: 'FREE. Top industrial engineering uni. ABB and Siemens partners.' },
  // Switzerland
  { name: 'ETH Zurich', country: 'Switzerland', flag: '🇨🇭', program: 'EE / AI', fit_score: 8.8, chance: 68, route: 'professor', notes: '#1 European uni. Target: Julia Vogt (Medical Data Science)' },
  { name: 'EPFL', country: 'Switzerland', flag: '🇨🇭', program: 'Bioengineering / Neuro-X', fit_score: 8.7, chance: 75, route: 'professor', notes: 'Lausanne, wearable tech research hub' },
  // UK
  { name: 'Imperial College London', country: 'UK', flag: '🇬🇧', program: 'Biomedical EE', fit_score: 8.8, chance: 82, route: 'both', notes: 'World top 10. Shortage occupation visa available for engineers.' },
  { name: 'UCL', country: 'UK', flag: '🇬🇧', program: 'CS / AI', fit_score: 8.5, chance: 85, route: 'direct', notes: 'Strong AI program, London tech ecosystem' },
  // Other
  { name: 'NUS Singapore', country: 'Singapore', flag: '🇸🇬', program: 'EE / AI', fit_score: 8.7, chance: 88, route: 'direct', notes: 'Asia hub, strong research funding' },
  { name: 'KAUST', country: 'Saudi Arabia', flag: '🇸🇦', program: 'EE / AI — FULLY FUNDED', fit_score: 9.0, chance: 95, route: 'direct', notes: 'FULLY FUNDED (stipend + tuition + housing). No cost. World-class AI research. Pakistani engineers actively recruited.' },
]

export const TOP_PROFESSORS = [
  { name: 'Dina Katabi', university: 'MIT', dept: 'CSAIL', research: 'Wireless health sensing, RF-based vital signs monitoring', email: 'dkatabi@mit.edu', fit: 9.5 },
  { name: 'Rosalind Picard', university: 'MIT', dept: 'Media Lab', research: 'Physiological computing, wearable biosensors, affective AI', email: 'picard@media.mit.edu', fit: 9.4 },
  { name: 'Collin Stultz', university: 'MIT / Harvard', dept: 'RLE + HMS', research: 'Cardiac ML, ECG analysis, clinical decision making AI', email: 'cmstultz@mit.edu', fit: 9.6 },
  { name: 'James Zou', university: 'Stanford', dept: 'HAI / Biomedical Data Science', research: 'Biomedical AI, clinical ML, algorithmic fairness in healthcare', email: 'jamesz@stanford.edu', fit: 9.3 },
  { name: 'Euan Ashley', university: 'Stanford', dept: 'Medicine / Cardiology', research: 'Precision cardiology, wearable cardiac monitoring, genomics AI', email: 'euan@stanford.edu', fit: 9.5 },
  { name: 'Zak Kohane', university: 'Harvard', dept: 'HMS Biomedical Informatics', research: 'Clinical AI pioneer, EHR data analysis, precision medicine', email: 'isaac_kohane@hms.harvard.edu', fit: 9.4 },
  { name: 'Finale Doshi-Velez', university: 'Harvard', dept: 'SEAS', research: 'ML for healthcare, interpretable AI in clinical settings', email: 'finale@seas.harvard.edu', fit: 9.1 },
  { name: 'Artur Dubrawski', university: 'CMU', dept: 'Auton Lab', research: 'Clinical AI, real-time patient monitoring, anomaly detection', email: 'awd@cs.cmu.edu', fit: 9.2 },
  { name: 'Julia Vogt', university: 'ETH Zurich', dept: 'Medical Data Science', research: 'Clinical ML, wearable health data, survival analysis', email: 'julia.vogt@inf.ethz.ch', fit: 9.0 },
  { name: 'Frank Rudzicz', university: 'U Toronto / Vector', dept: 'Vector Institute', research: 'AI for healthcare, clinical NLP, health decision support', email: 'frank@cs.toronto.edu', fit: 8.9 },
]
