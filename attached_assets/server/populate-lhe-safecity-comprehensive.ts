import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// LHE-Safecity comprehensive data from the provided image
const lheSafecityData = [
  { empId: '70501', name: 'Muhammad Ashraf', fatherName: 'Peer Muhammad', dob: '12-Dec-95', age: 30, cnic: '3220118132597', designation: 'Senior Technician', contractDate: '1-Jun-24', contractMonths: 6, contractExpiryDate: '1-Dec-24' },
  { empId: '70502', name: 'Muhammad Zeeshan', fatherName: 'Muneer Ahmad', dob: '10-Apr-98', age: 27, cnic: '3520165756775', designation: 'Technician', contractDate: '30-May-24', contractMonths: 6, contractExpiryDate: '30-Nov-24' },
  { empId: '70503', name: 'Muhammad Akhtar', fatherName: 'Muhammad Ashraf', dob: '1-Jan-96', age: 29, cnic: '3520149519335', designation: 'Senior Splicer', contractDate: '2-Jun-24', contractMonths: 6, contractExpiryDate: '2-Dec-24' },
  { empId: '70504', name: 'Muhammad Sohan Nasar', fatherName: 'Nisar Ahmad', dob: '5-Jul-97', age: 27, cnic: '3520180768769', designation: 'Splicer', contractDate: '2-Jun-24', contractMonths: 6, contractExpiryDate: '2-Dec-24' },
  { empId: '70505', name: 'Muhammad Amjad Bilal', fatherName: 'Malik Muhammad Bilal', dob: '11-Sep-94', age: 30, cnic: '3610294285553', designation: 'Helper', contractDate: '2-Jun-24', contractMonths: 6, contractExpiryDate: '2-Dec-24' },
  { empId: '70506', name: 'Muhammad Amjad', fatherName: 'Muhammad Basheh', dob: 'Missing', age: 'Missing', cnic: '3640118406050', designation: 'Senior Splicer', contractDate: '6-Jun-24', contractMonths: 6, contractExpiryDate: '6-Dec-24' },
  { empId: '70507', name: 'Adnan Ali', fatherName: 'Allah Ditta Imran', dob: 'Missing', age: 'Missing', cnic: '3110248836335', designation: 'Office Boy', contractDate: '6-Sep-24', contractMonths: 6, contractExpiryDate: '6-Mar-25' },
  { empId: '70508', name: 'Muhammad Ahmad Ali', fatherName: 'Muhammad Ashfaq', dob: 'Missing', age: 32, cnic: '3520137292597', designation: 'OFC Technician', contractDate: '30-May-24', contractMonths: 6, contractExpiryDate: '30-Feb-25' },
  { empId: '70509', name: 'Raheel', fatherName: 'Amjad Ashraf', dob: 'Missing', age: 'Missing', cnic: '3520274842709', designation: 'Office Boy', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70510', name: 'Syed Hadi Abbas Naqvi', fatherName: 'Syed Qasim Hasan Naqvi', dob: 'Missing', age: 'Missing', cnic: 'Missing', designation: 'LESCO Team Lead', contractDate: '26-Jul-24', contractMonths: 6, contractExpiryDate: '26-Jan-25' },
  { empId: '70511', name: 'Muhammad Norhan Akram', fatherName: 'Muhammad Akram', dob: '28-Oct-94', age: 31, cnic: '3510239997251', designation: 'PSCA Coordinator', contractDate: '1-Sep-24', contractMonths: 6, contractExpiryDate: '1-Mar-25' },
  { empId: '70512', name: 'Umer Farooq', fatherName: 'Majeed Ullah', dob: '26-Sep-99', age: 26, cnic: '3520650509697', designation: 'LESCO Technician', contractDate: '19-May-24', contractMonths: 6, contractExpiryDate: '19-Feb-25' },
  { empId: '70513', name: 'Muhammad Mustaqfa', fatherName: 'Muhammad Sadiq', dob: '3-Jun-95', age: 'Missing', cnic: '3520242536409', designation: 'Helper', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70514', name: 'Muhammad Fayyaz', fatherName: 'Muhammad Riaz Ahmad', dob: '11-Jul-96', age: 29, cnic: '3520385044003', designation: 'Team Lead', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70515', name: 'Adeel Ahmad', fatherName: 'Jameel Ahmad', dob: '10-Feb-96', age: 29, cnic: '4120499394141', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70516', name: 'Muhammad Luqman', fatherName: 'Dasandi', dob: '12-Apr-82', age: 43, cnic: '3610440063103', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70517', name: 'Hamza Naveed', fatherName: 'Muhammad Naveed', dob: '10-Jan-97', age: 28, cnic: '3520175831205', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70518', name: 'Izhar Mahmood', fatherName: 'Sultan Mahmood', dob: '17-Jan-95', age: 30, cnic: '3520197367689', designation: 'Junior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70519', name: 'Ali Raza', fatherName: 'Khalil Ahmed', dob: '1-Dec-92', age: 33, cnic: '3650230477769', designation: 'Junior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70520', name: 'Waqas', fatherName: 'Ghulam Rasool', dob: '5-Jan-95', age: 30, cnic: '3520127653267', designation: 'Junior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70521', name: 'Yasir Ahmad', fatherName: 'Mushtaq Ahmad Qadri', dob: '1-Apr-95', age: 30, cnic: '3520276483693', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70522', name: 'Syed Qamar Abbas Naqvi', fatherName: 'Syed Asghar Abbas Naqvi', dob: '21-Jun-96', age: 29, cnic: '3520157726015', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70523', name: 'Shahraz Shabir', fatherName: 'Shabir Ahmad', dob: '20-Sep-98', age: 27, cnic: '3520165874619', designation: 'Junior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70524', name: 'Muhammad Yaqoob', fatherName: 'Muhammad Yaqoob', dob: '1-Sep-94', age: 31, cnic: '3460214140961', designation: 'Junior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70525', name: 'Abdul Rehman', fatherName: 'Shafeeq Ahmad', dob: '11-Oct-03', age: 22, cnic: '3510247549535', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70526', name: 'Mujahid Usman', fatherName: 'Farman Ali', dob: '21-Sep-01', age: 24, cnic: '3520267881765', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70527', name: 'Muhammad Aqeel Arshad', fatherName: 'Arshad Ali', dob: '27-Oct-04', age: 21, cnic: '3520199450179', designation: 'Junior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70528', name: 'Adnan Ghulam', fatherName: 'Ghulam Muhammad', dob: '5-Feb-97', age: 28, cnic: '3220360496189', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70529', name: 'Syed Ahsan', fatherName: 'Syed Muhammad Nazir', dob: '8-Aug-91', age: 31, cnic: '3520327581825', designation: 'Junior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70530', name: 'Muhammad Shakeel', fatherName: 'Muhammad Sharif', dob: '19-Aug-98', age: 27, cnic: '3310551036335', designation: 'Team Lead', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70531', name: 'Sunil Sarfraz', fatherName: 'Sharif Sarfraz', dob: '3-Feb-94', age: 31, cnic: '3520621649921', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70532', name: 'Malik Muhammad Rizwan', fatherName: 'Muhammad Rizwan', dob: '4-Apr-04', age: 21, cnic: '3520242660389', designation: 'Signal Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70533', name: 'Muhammad Nazer', fatherName: 'Muhammad Riaz', dob: '12-Jan-03', age: 22, cnic: '3840145858521', designation: 'Signal Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70534', name: 'Zubair Farooq', fatherName: 'Muhammad Farooq Shahid', dob: '7-Dec-90', age: 35, cnic: '3520242015637', designation: 'Signal Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70535', name: 'Fayyaz Ahmad', fatherName: 'Faruq Ahmad', dob: '18-Jul-96', age: 29, cnic: '3520199820265', designation: 'Signal Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70536', name: 'Hafiz Nauman', fatherName: 'Haji Nauman', dob: 'Missing', age: 'Missing', cnic: '3120112664557', designation: 'Senior Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70537', name: 'Muhammad Rehman', fatherName: 'Muhammad Aslam', dob: '5-Jun-06', age: 19, cnic: '3510268904751', designation: 'Senior Signal Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70538', name: 'Yasir Ahmad', fatherName: 'Muhammad Aslam', dob: '29-Jul-95', age: 30, cnic: '3510402635657', designation: 'Senior Signal Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70539', name: 'Khurram Shahzad', fatherName: 'Shahzad Ahmad', dob: '26-Jan-97', age: 28, cnic: '3520107607289', designation: 'Senior Signal Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70540', name: 'Zain Ul Abdin', fatherName: 'Abdul Rehman', dob: '27-Sep-97', age: 28, cnic: '3520140571793', designation: 'Senior Signal Technician', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70541', name: 'Zahid Iqbal', fatherName: 'Ghulam Rasool', dob: 'Missing', age: 'Missing', cnic: '3430100569417', designation: 'Senior Splicer', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70542', name: 'Ali Raza', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520111767401', designation: 'Helper', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70543', name: 'Muhammad Ashfaq', fatherName: 'Muhammad Sultan', dob: '17-Jan-92', age: 33, cnic: '3520275955033', designation: 'Senior Technician', contractDate: '1-Sep-24', contractMonths: 6, contractExpiryDate: '1-Mar-25' },
  { empId: '70544', name: 'Mubashir', fatherName: 'Khursheed Ahmad', dob: '2-Dec-02', age: 22, cnic: '3610369460225', designation: 'Senior Technician', contractDate: '1-Mar-24', contractMonths: 6, contractExpiryDate: '1-Mar-25' },
  { empId: '70545', name: 'Azeem', fatherName: 'Abdul Hameed', dob: '13-Sep-03', age: 25, cnic: '3520188132509', designation: 'Junior Technician', contractDate: '1-Feb-24', contractMonths: 6, contractExpiryDate: '1-Feb-25' },
  { empId: '70546', name: 'Muhammad Shahbaz', fatherName: 'Maqbool Ahmad', dob: '15-Apr-89', age: 36, cnic: '3550102862011', designation: 'Junior Technician', contractDate: '16-Aug-24', contractMonths: 6, contractExpiryDate: '16-Feb-25' },
  { empId: '70547', name: 'Khurram Shehzad', fatherName: 'Muhammad Aslam', dob: '7-Sep-84', age: 41, cnic: '3440232389595', designation: 'LESCO Junior Technician', contractDate: '16-Aug-24', contractMonths: 6, contractExpiryDate: '16-Feb-25' },
  { empId: '70548', name: 'Syed Farrukh Iqbal', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: 'Missing', designation: 'Store Staff', contractDate: '1-Jul-24', contractMonths: 6, contractExpiryDate: '1-Jan-25' },
  { empId: '70549', name: 'Sarwar Ahmad', fatherName: 'Muhammad Akbar Ali', dob: '15-Oct-85', age: 40, cnic: '3520161539079', designation: 'Helper OFC', contractDate: '19-Aug-24', contractMonths: 6, contractExpiryDate: '19-Feb-25' },
  { empId: '70550', name: 'Zohaid Ur Rehman', fatherName: 'Abiq Ur Rehman', dob: 'Missing', age: 'Missing', cnic: 'Missing', designation: 'Helper OFC', contractDate: '1-Aug-24', contractMonths: 6, contractExpiryDate: '1-Feb-25' },
  { empId: '70551', name: 'Raza Tufail', fatherName: 'Tufail Haseeb', dob: '15-Sep-96', age: 29, cnic: '3520491271685', designation: 'Helper OFC', contractDate: '12-Aug-24', contractMonths: 11, contractExpiryDate: '12-Jul-25' },
  { empId: '70552', name: 'Tauqir', fatherName: 'Allah Rakha', dob: '11-Aug-98', age: 29, cnic: '3420176637521', designation: 'Helper OFC', contractDate: '12-Aug-24', contractMonths: 11, contractExpiryDate: '12-Jul-25' },
  { empId: '70553', name: 'Sabeer Sain', fatherName: 'Allar Ali', dob: '31-Dec-97', age: 28, cnic: '3450174637751', designation: 'Senior Technician (OFC)', contractDate: '26-Aug-24', contractMonths: 11, contractExpiryDate: '26-Jul-25' },
  { empId: '70554', name: 'Sohaib', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520239747307', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  // Additional employees with Helper OFC and other designations
  { empId: '70555', name: 'Abdul Qayoom', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3320225873157', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70556', name: 'Muhammad Ali', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3530194122475', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70557', name: 'Muhammad Ahmed', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520116051375', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70558', name: 'Shoaib Yousaf', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520282230713', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70559', name: 'Naveed Ahmad', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520166325149', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70560', name: 'Ahtasham Ul Haq Qadri', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520268202823', designation: 'Technician OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70561', name: 'Muhammad Ahmad Ali', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520135782947', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70562', name: 'Asrar Ahmad', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520277789325', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70563', name: 'Qaiser Bhatti', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520182010201', designation: 'Camera', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70564', name: 'Abdullah', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3510205428581', designation: 'Camera', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70565', name: 'Ali Raza', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3320214749769', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70566', name: 'Muhammad Nisar', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520188534229', designation: 'Camera', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70567', name: 'Muhammad Adeeb Masood', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3740373529885', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70568', name: 'Naveed', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520272538833', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70569', name: 'Zeeshan Ali', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3520161140045', designation: 'Helper OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' },
  { empId: '70570', name: 'Umer Daraz', fatherName: 'Missing', dob: 'Missing', age: 'Missing', cnic: '3610262923793', designation: 'Supervisor OFC', contractDate: 'Missing', contractMonths: 'Missing', contractExpiryDate: 'Missing' }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic || cnic === 'Missing') return '';
  return cnic.replace(/[-\s]/g, '');
}

function normalizeNameForMatching(name: string): string {
  const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Syed', 'Muhammad', 'Mohammad', 'Raja', 'Sheikh', 'M.', 'Malik'];
  let normalized = name;
  
  prefixes.forEach(prefix => {
    const regex = new RegExp(`^${prefix}\\s+`, 'i');
    normalized = normalized.replace(regex, '');
  });
  
  return normalized
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .toLowerCase();
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeNameForMatching(name1);
  const n2 = normalizeNameForMatching(name2);
  
  if (n1 === n2) return 100;
  
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');
  
  let matches = 0;
  let totalWords = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matches++;
        break;
      }
    }
  }
  
  return Math.round((matches / totalWords) * 100);
}

function parseBirthday(dobStr: string): Date | null {
  try {
    if (!dobStr || dobStr === 'Missing') return null;
    
    // Handle formats like "12-Dec-95", "10-Apr-98", etc.
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = dobStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = monthMap[parts[1]] || parts[1];
      let year = parts[2];
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
      }
      
      return new Date(`${year}-${month}-${day}`);
    }
    
    return null;
  } catch (error) {
    console.log(`Error parsing DOB: ${dobStr}`, error);
    return null;
  }
}

function parseContractDate(dateStr: string): Date | null {
  try {
    if (!dateStr || dateStr === 'Missing') return null;
    
    // Handle formats like "1-Jun-24", "30-May-24"
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = monthMap[parts[1]] || parts[1];
      let year = parts[2];
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
      }
      
      return new Date(`${year}-${month}-${day}`);
    }
    
    return null;
  } catch (error) {
    console.log(`Error parsing contract date: ${dateStr}`, error);
    return null;
  }
}

async function populateLheSafecityComprehensive() {
  console.log('🔄 Populating LHE-Safecity comprehensive data...\n');
  
  // Get all LHE-Safecity employees
  const lheSafecityEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`📋 Found ${lheSafecityEmployees.length} LHE-Safecity employees in database`);
  console.log(`📋 Found ${lheSafecityData.length} employees with comprehensive data`);
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const exactEmpIdMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of lheSafecityData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact Employee ID match first (most reliable for LHE-Safecity)
    if (csvEmployee.empId) {
      const empIdMatch = lheSafecityEmployees.find(emp => 
        emp.employeeCode === csvEmployee.empId
      );
      
      if (empIdMatch) {
        exactEmpIdMatches.push({
          csvData: csvEmployee,
          employee: empIdMatch,
          matchType: 'EXACT_EMP_ID'
        });
        continue;
      }
    }
    
    // Check for exact CNIC match
    if (csvCnicNormalized) {
      const cnicMatch = lheSafecityEmployees.find(emp => {
        const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
        return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
      });
      
      if (cnicMatch) {
        exactCnicMatches.push({
          csvData: csvEmployee,
          employee: cnicMatch,
          matchType: 'EXACT_CNIC'
        });
        continue;
      }
    }
    
    // Check for exact name match
    const nameMatch = lheSafecityEmployees.find(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      return dbNameNormalized === csvNameNormalized;
    });
    
    if (nameMatch) {
      exactNameMatches.push({
        csvData: csvEmployee,
        employee: nameMatch,
        matchType: 'EXACT_NAME'
      });
      continue;
    }
    
    // Check for near matches (similarity > 85%)
    const potentialMatches = lheSafecityEmployees.map(emp => {
      const similarity = calculateNameSimilarity(csvEmployee.name, `${emp.firstName} ${emp.lastName}`);
      
      return {
        csvData: csvEmployee,
        employee: emp,
        similarity,
        matchType: 'NEAR_MATCH'
      };
    }).filter(match => match.similarity > 85)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (potentialMatches.length > 0) {
      nearMatches.push(...potentialMatches.slice(0, 2)); // Top 2 matches
    } else {
      noMatches.push({
        csvData: csvEmployee,
        matchType: 'NO_MATCH'
      });
    }
  }
  
  console.log('\n📊 LHE-Safecity Match Analysis Results:');
  console.log(`✅ Exact Employee ID matches: ${exactEmpIdMatches.length}`);
  console.log(`✅ Exact CNIC matches: ${exactCnicMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  // Auto-approve exact matches
  const approvedMatches = [...exactEmpIdMatches, ...exactCnicMatches, ...exactNameMatches];
  
  if (exactEmpIdMatches.length > 0) {
    console.log('\n✅ EXACT EMPLOYEE ID MATCHES (Auto-approve):');
    exactEmpIdMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    Designation: ${match.csvData.designation}`);
      console.log(`    CNIC: ${match.csvData.cnic} | DOB: ${match.csvData.dob}`);
      console.log(`    Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate} (${match.csvData.contractMonths} months)`);
    });
  }
  
  if (exactCnicMatches.length > 0) {
    console.log('\n✅ EXACT CNIC MATCHES (Auto-approve):');
    exactCnicMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    Designation: ${match.csvData.designation}`);
      console.log(`    CNIC: ${match.csvData.cnic} | DOB: ${match.csvData.dob}`);
      console.log(`    Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate} (${match.csvData.contractMonths} months)`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    Designation: ${match.csvData.designation}`);
      console.log(`    CNIC: ${match.csvData.cnic} | DOB: ${match.csvData.dob}`);
      console.log(`    Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate} (${match.csvData.contractMonths} months)`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}" (${match.similarity}%)`);
      console.log(`    Designation: ${match.csvData.designation}`);
      console.log(`    CSV CNIC: ${match.csvData.cnic} | DB CNIC: ${match.employee.nationalId || 'N/A'}`);
      console.log(`    Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate}`);
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - EmpID: ${match.csvData.empId} - "${match.csvData.name}" (${match.csvData.designation})`);
      console.log(`    CNIC: ${match.csvData.cnic} | DOB: ${match.csvData.dob}`);
      console.log(`    Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate}`);
    });
  }
  
  // Update approved matches with comprehensive data
  if (approvedMatches.length > 0) {
    console.log('\n🔄 Updating approved matches with comprehensive data...');
    
    let updateCount = 0;
    let errorCount = 0;
    const results: any[] = [];
    
    for (const match of approvedMatches) {
      try {
        console.log(`🔄 Updating ${match.employee.employeeCode}...`);
        
        // Parse dates
        const birthday = parseBirthday(match.csvData.dob);
        const contractDate = parseContractDate(match.csvData.contractDate);
        const contractExpiryDate = parseContractDate(match.csvData.contractExpiryDate);
        
        // Normalize data
        const normalizedCnic = normalizeCNIC(match.csvData.cnic);
        
        // Prepare update data
        const updateData: any = {
          designation: match.csvData.designation,
          updatedAt: new Date()
        };
        
        // Only update fields if they're empty or different
        if (!match.employee.nationalId && normalizedCnic) {
          updateData.nationalId = normalizedCnic;
        }
        
        if (!match.employee.birthday && birthday) {
          updateData.birthday = birthday;
        }
        
        if (!match.employee.contractDate && contractDate) {
          updateData.contractDate = contractDate;
        }
        
        if (!match.employee.contractExpiryDate && contractExpiryDate) {
          updateData.contractExpiryDate = contractExpiryDate;
        }
        
        if (!match.employee.contractTerm && match.csvData.contractMonths !== 'Missing') {
          updateData.contractTerm = `${match.csvData.contractMonths} months`;
        }
        
        // Update employee record
        await db.update(employeeRecords)
          .set(updateData)
          .where(eq(employeeRecords.id, match.employee.id));
        
        updateCount++;
        
        results.push({
          employeeCode: match.employee.employeeCode,
          name: `${match.employee.firstName} ${match.employee.lastName}`,
          designation: match.csvData.designation,
          cnic: normalizedCnic,
          birthday: match.csvData.dob,
          contractDate: match.csvData.contractDate,
          contractExpiryDate: match.csvData.contractExpiryDate,
          contractTerm: match.csvData.contractMonths !== 'Missing' ? `${match.csvData.contractMonths} months` : 'N/A'
        });
        
        console.log(`   ✅ Updated: ${match.employee.firstName} ${match.employee.lastName}`);
        console.log(`      Designation: ${match.csvData.designation}`);
        console.log(`      CNIC: ${normalizedCnic} | DOB: ${match.csvData.dob}`);
        console.log(`      Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate}`);
        
      } catch (error) {
        console.log(`   ❌ Error updating ${match.employee.employeeCode}: ${error}`);
        errorCount++;
      }
      console.log('');
    }
    
    console.log('\n📊 LHE-Safecity Comprehensive Update Summary:');
    console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (results.length > 0) {
      console.log('\n✅ Updated LHE-Safecity employees with comprehensive data:');
      results.forEach(result => {
        console.log(`  - ${result.employeeCode}: ${result.name}`);
        console.log(`    Designation: ${result.designation}`);
        console.log(`    CNIC: ${result.cnic} | DOB: ${result.birthday}`);
        console.log(`    Contract: ${result.contractTerm}`);
      });
    }
  }
  
  // Check final coverage
  const finalEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity'),
      eq(employeeRecords.isActive, true)
    ));
  
  const total = finalEmployees.length;
  const withDesignations = finalEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const withCnics = finalEmployees.filter(emp => emp.nationalId && emp.nationalId !== '').length;
  const withBirthdays = finalEmployees.filter(emp => emp.birthday).length;
  const withContracts = finalEmployees.filter(emp => emp.contractDate).length;
  
  console.log('\n📊 Final LHE-Safecity Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${Math.round((withDesignations / total) * 100)}%)`);
  console.log(`   With CNICs: ${withCnics} (${Math.round((withCnics / total) * 100)}%)`);
  console.log(`   With birthdays: ${withBirthdays} (${Math.round((withBirthdays / total) * 100)}%)`);
  console.log(`   With contract data: ${withContracts} (${Math.round((withContracts / total) * 100)}%)`);
  
  console.log('\n🎯 LHE-Safecity comprehensive data population completed!');
  console.log('📈 Department coverage significantly improved with authentic employee data!');
}

populateLheSafecityComprehensive().catch(console.error);