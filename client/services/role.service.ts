/** Read-only career-role catalog used by assessment, gap analysis and roadmaps. */
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CareerRole } from "@shared/types";

const ROLES = "roles";

export async function getCareerRoles(): Promise<CareerRole[]> {
  const snapshot = await getDocs(query(collection(db, ROLES), orderBy("title")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CareerRole);
}
