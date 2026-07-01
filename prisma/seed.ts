import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// SRS.md section 3.1: the ten archive categories from the MD's brief.
const CATEGORIES = [
  "Events",
  "Workshops",
  "Training",
  "Meetings",
  "Conferences",
  "NGO Projects",
  "Campaigns",
  "Field Visits",
  "Donor Visits",
  "Media Events",
];

// SRS.md FR-2.1: the standard 17-folder set. Assigned in full to the
// content-heavy categories; lean categories (e.g. Meetings) get a subset,
// per HANDOFF.md point 1 ("a Meeting shouldn't get Press Release folders").
const FULL_FOLDER_SET = [
  { name: "01 Proposal", mandatory: true },
  { name: "02 Approval", mandatory: true },
  { name: "03 Budget", mandatory: false },
  { name: "04 Agenda", mandatory: false },
  { name: "05 Invitations", mandatory: false },
  { name: "06 Attendance", mandatory: false },
  { name: "07 Presentations", mandatory: false },
  { name: "08 Photos", mandatory: false },
  { name: "09 Videos", mandatory: false },
  { name: "10 Press Release", mandatory: false },
  { name: "11 Media Coverage", mandatory: false },
  { name: "12 Social Media", mandatory: false },
  { name: "13 Financial Documents", mandatory: false },
  { name: "14 Procurement", mandatory: false },
  { name: "15 Final Report", mandatory: true },
  { name: "16 Lessons Learned", mandatory: false },
  { name: "17 Supporting Documents", mandatory: false },
];

const LEAN_FOLDER_SET = [
  { name: "01 Proposal", mandatory: true },
  { name: "02 Approval", mandatory: true },
  { name: "04 Agenda", mandatory: false },
  { name: "06 Attendance", mandatory: false },
  { name: "07 Presentations", mandatory: false },
  { name: "15 Final Report", mandatory: true },
  { name: "17 Supporting Documents", mandatory: false },
];

const LEAN_CATEGORIES = new Set(["Meetings"]);

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-ngo" },
    update: {},
    create: {
      name: "Demo NGO Foundation",
      slug: "demo-ngo",
      industry: "ngo",
    },
  });

  const roleDefs = [
    {
      name: "Administrator",
      canCreateArchive: true,
      canUpload: true,
      canEditMetadata: true,
      canDeleteArchive: true,
      canHardDelete: true,
      canManageUsers: true,
      canManageSettings: true,
      canGenerateReport: true,
      canViewAll: true,
      canDownload: true,
    },
    {
      name: "Archive Officer",
      canCreateArchive: true,
      canUpload: true,
      canEditMetadata: true,
      canDeleteArchive: false,
      canHardDelete: false,
      canManageUsers: false,
      canManageSettings: false,
      canGenerateReport: true,
      canViewAll: true,
      canDownload: true,
    },
    {
      name: "Department User",
      canCreateArchive: false,
      canUpload: true,
      canEditMetadata: false,
      canDeleteArchive: false,
      canHardDelete: false,
      canManageUsers: false,
      canManageSettings: false,
      canGenerateReport: false,
      canViewAll: false,
      canDownload: true,
    },
    {
      name: "Viewer",
      canCreateArchive: false,
      canUpload: false,
      canEditMetadata: false,
      canDeleteArchive: false,
      canHardDelete: false,
      canManageUsers: false,
      canManageSettings: false,
      canGenerateReport: false,
      canViewAll: false,
      canDownload: false,
    },
  ];

  const roles: Record<string, { id: string }> = {};
  for (const def of roleDefs) {
    const role = await prisma.role.upsert({
      where: { organizationId_name: { organizationId: org.id, name: def.name } },
      update: def,
      create: { organizationId: org.id, ...def },
    });
    roles[def.name] = role;
  }

  const passwordHash = await bcrypt.hash("Password123!", 10);
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "admin@demo-ngo.org" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "admin@demo-ngo.org",
      passwordHash,
      name: "Ava Administrator",
      department: "IT",
      roleId: roles["Administrator"].id,
    },
  });
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "officer@demo-ngo.org" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "officer@demo-ngo.org",
      passwordHash,
      name: "Omar Officer",
      department: "Programs",
      roleId: roles["Archive Officer"].id,
    },
  });
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "deptuser@demo-ngo.org" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "deptuser@demo-ngo.org",
      passwordHash,
      name: "Dana Deptuser",
      department: "Programs",
      roleId: roles["Department User"].id,
    },
  });
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "viewer@demo-ngo.org" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "viewer@demo-ngo.org",
      passwordHash,
      name: "Val Viewer",
      department: "Finance",
      roleId: roles["Viewer"].id,
    },
  });

  const categories: Record<string, { id: string }> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const name = CATEGORIES[i];
    const category = await prisma.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      update: {},
      create: { organizationId: org.id, name, order: i },
    });
    categories[name] = category;

    const folderSet = LEAN_CATEGORIES.has(name) ? LEAN_FOLDER_SET : FULL_FOLDER_SET;
    for (let j = 0; j < folderSet.length; j++) {
      const folder = folderSet[j];
      await prisma.folderTemplate.upsert({
        where: { categoryId_name: { categoryId: category.id, name: folder.name } },
        update: {},
        create: {
          organizationId: org.id,
          categoryId: category.id,
          name: folder.name,
          order: j,
          isMandatory: folder.mandatory,
        },
      });
    }
  }

  // SRS.md 3.3/point 11: Donor and Project as managed lookup lists.
  const donorList = await prisma.lookupList.upsert({
    where: { organizationId_key: { organizationId: org.id, key: "donor" } },
    update: {},
    create: { organizationId: org.id, key: "donor" },
  });
  for (const donor of ["Global Health Trust Foundation", "Regional Development Fund", "UNICEF"]) {
    await prisma.lookupListItem.upsert({
      where: { lookupListId_value: { lookupListId: donorList.id, value: donor } },
      update: {},
      create: { lookupListId: donorList.id, value: donor },
    });
  }

  const projectList = await prisma.lookupList.upsert({
    where: { organizationId_key: { organizationId: org.id, key: "project" } },
    update: {},
    create: { organizationId: org.id, key: "project" },
  });
  for (const project of ["Community Health Outreach", "Youth Leadership Program"]) {
    await prisma.lookupListItem.upsert({
      where: { lookupListId_value: { lookupListId: projectList.id, value: project } },
      update: {},
      create: { lookupListId: projectList.id, value: project },
    });
  }

  // HANDOFF.md point 10: photo consent flag as an org-configurable custom field.
  await prisma.customFieldDefinition.upsert({
    where: { organizationId_key: { organizationId: org.id, key: "consent_obtained" } },
    update: {},
    create: {
      organizationId: org.id,
      key: "consent_obtained",
      label: "Consent Obtained",
      fieldType: "boolean",
      isRequired: false,
      order: 0,
    },
  });

  // Sample archive with its provisioned folder structure, to prove the flow.
  const admin = await prisma.user.findFirstOrThrow({
    where: { organizationId: org.id, email: "admin@demo-ngo.org" },
  });

  const sampleArchive = await prisma.archive.upsert({
    where: { organizationId_archiveNumber: { organizationId: org.id, archiveNumber: "ARC-2026-00001" } },
    update: {},
    create: {
      organizationId: org.id,
      archiveNumber: "ARC-2026-00001",
      name: "Annual General Meeting 2026",
      categoryId: categories["Meetings"].id,
      department: "Programs",
      venue: "Head Office Auditorium",
      organizer: "Programs Department",
      donor: "Global Health Trust Foundation",
      projectName: "Community Health Outreach",
      tags: ["agm", "annual", "governance"],
      description: "Annual General Meeting archive, migrated as a high-visibility first record.",
      status: "Archived",
      createdById: admin.id,
    },
  });

  const leanFolders = LEAN_FOLDER_SET;
  for (let j = 0; j < leanFolders.length; j++) {
    const folder = leanFolders[j];
    await prisma.folder.upsert({
      where: { archiveId_name: { archiveId: sampleArchive.id, name: folder.name } },
      update: {},
      create: {
        archiveId: sampleArchive.id,
        name: folder.name,
        order: j,
        isMandatory: folder.mandatory,
      },
    });
  }

  // Always-open Migration Inbox archive (HANDOFF.md point 3).
  await prisma.archive.upsert({
    where: { organizationId_archiveNumber: { organizationId: org.id, archiveNumber: "ARC-INBOX" } },
    update: {},
    create: {
      organizationId: org.id,
      archiveNumber: "ARC-INBOX",
      name: "Migration Inbox",
      status: "Draft",
      isMigrationInbox: true,
      createdById: admin.id,
    },
  });

  console.log(`Seeded organization "${org.name}" (${org.slug})`);
  console.log("Login as admin@demo-ngo.org / officer@demo-ngo.org with password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
