/**
 * Directory service — the institution and organization lists that onboarding needs.
 *
 * These are read through the server rather than Firestore because they must be available
 * *before* the user has an account, and because the server returns only the fields a
 * signup form needs (id, name, departments) rather than the full records.
 */

export interface DirectoryInstitution {
  id: string;
  name: string;
  location: string;
  departments: string[];
}

export interface DirectoryOrganization {
  id: string;
  name: string;
  domain: string;
}

export async function getInstitutionDirectory(): Promise<DirectoryInstitution[]> {
  const response = await fetch('/api/directory/institutions');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load institutions.');
  return data.institutions as DirectoryInstitution[];
}

export async function getOrganizationDirectory(): Promise<DirectoryOrganization[]> {
  const response = await fetch('/api/directory/organizations');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load organizations.');
  return data.organizations as DirectoryOrganization[];
}
