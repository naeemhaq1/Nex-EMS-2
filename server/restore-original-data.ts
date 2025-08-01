import { db } from "./db";
import { employeeRecords } from "../shared/schema";
import { eq } from "drizzle-orm";

// This contains the original data that was incorrectly removed
const originalData = [
  { employeeCode: "10090689", nationalId: "3310077398279" },
  { employeeCode: "10090690", nationalId: "3310234622913" },
  { employeeCode: "10090605", nationalId: "3320358129625" },
  { employeeCode: "10090643", nationalId: "3310050188141" },
  { employeeCode: "10090684", nationalId: "3310086117105" },
  { employeeCode: "10090687", nationalId: "3310077775501" },
  { employeeCode: "10090703", nationalId: "3840504300385" },
  { employeeCode: "10090517", nationalId: "3310332318245" },
  { employeeCode: "10009201", nationalId: "3310040706239" },
  { employeeCode: "10090547", nationalId: "1730187706669" },
  { employeeCode: "10090188", nationalId: "3310070541055" },
  { employeeCode: "10090273", nationalId: "6110142515899" },
  { employeeCode: "10090310", nationalId: "3320137005589" },
  { employeeCode: "10090565", nationalId: "1730115628363" },
  { employeeCode: "10090311", nationalId: "3310083688277" },
  { employeeCode: "10090644", nationalId: "3310047236663" },
  { employeeCode: "10090584", nationalId: "3310954775991" },
  { employeeCode: "10090645", nationalId: "3310052379759" },
  { employeeCode: "10090557", nationalId: "3330360523313" },
  { employeeCode: "10090631", nationalId: "3301251033359" },
  { employeeCode: "10090694", nationalId: "3320177707043" },
  { employeeCode: "10090695", nationalId: "3450141195093" },
  { employeeCode: "10090698", nationalId: "3840505307321" },
  { employeeCode: "10090699", nationalId: "1420118697827" },
  { employeeCode: "10090701", nationalId: "3520297042485" },
  { employeeCode: "10090700", nationalId: "3530341586265" },
  { employeeCode: "10090704", nationalId: "3310098479733" },
  { employeeCode: "10009200", nationalId: "3310031359633" },
  { employeeCode: "10009300", nationalId: "3310003077785" },
  { employeeCode: "10090139", nationalId: "3310008678189" },
  { employeeCode: "10090625", nationalId: "1730139331057" },
  { employeeCode: "10009101", nationalId: "3310008125619" },
  { employeeCode: "10009100", nationalId: "3310217716575" },
  { employeeCode: "10090679", nationalId: "3310288509589" },
  { employeeCode: "10090688", nationalId: "3110284791855" },
  { employeeCode: "10090686", nationalId: "3310034101393" },
  { employeeCode: "10090143", nationalId: "3320178114405" },
  { employeeCode: "10090551", nationalId: "3610112017459" },
  { employeeCode: "10090552", nationalId: "1310123941133" },
  { employeeCode: "10090626", nationalId: "1730113550797" },
  { employeeCode: "10090627", nationalId: "1730173315143" },
  { employeeCode: "10090628", nationalId: "1730138597141" }
];

async function restoreOriginalData() {
  console.log("Starting restoration of original national ID data...");
  
  try {
    let restoredCount = 0;
    
    for (const record of originalData) {
      console.log(`Restoring: ${record.employeeCode} -> ${record.nationalId}`);
      
      await db
        .update(employeeRecords)
        .set({ 
          nationalId: record.nationalId,
          updatedAt: new Date()
        })
        .where(eq(employeeRecords.employeeCode, record.employeeCode));
      
      restoredCount++;
    }
    
    console.log(`\nRestoration completed. Restored ${restoredCount} original national ID records.`);
    
  } catch (error) {
    console.error("Error during restoration:", error);
  }
}

// Run the restoration
restoreOriginalData().catch(console.error);