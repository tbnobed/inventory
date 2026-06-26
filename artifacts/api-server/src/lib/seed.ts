import { db, usersTable, machinesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function seedAdminUser() {
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    logger.warn("ADMIN_USER or ADMIN_PASSWORD not set — skipping admin seed");
    return;
  }

  const existing = await db.select().from(usersTable);
  if (existing.length > 0) {
    return; // Users already exist, skip seed
  }

  const hash = await bcrypt.hash(adminPassword, 12);
  await db.insert(usersTable).values({
    username: adminUser,
    password_hash: hash,
    role: "admin",
  });

  logger.info(
    { username: adminUser },
    "=== First boot: seeded admin user. Change this password after first login. ==="
  );
}

export async function seedSampleMachines() {
  const count = await db.select().from(machinesTable);
  if (count.length > 0) return; // Already have data

  const now = new Date();
  const stale = new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000); // 16 days ago

  await db.insert(machinesTable).values([
    {
      machine_id: "a1b2c3d4-0001-0001-0001-000000000001",
      hostname: "EDIT-DAL-01",
      site: "Dallas",
      last_seen: now,
      manufacturer: "MSI",
      model: "MS-7D86",
      cpu: "Intel(R) Core(TM) i9-14900K | 24C/32T @ 3.2GHz",
      total_ram_gb: 128,
      ram_type: "DDR5",
      gpu1_model: "NVIDIA GeForce RTX 4090",
      os: "Microsoft Windows 11 Pro 10.0.26100",
      primary_ip: "10.20.5.42",
      data: {
        Manufacturer: "MSI", Model: "MS-7D86", Serial: "M220401047",
        Motherboard: "MSI MAG Z790 TOMAHAWK WIFI", BIOS: "American Megatrends 1.B0",
        OS: "Microsoft Windows 11 Pro 10.0.26100",
        CPU: "Intel(R) Core(TM) i9-14900K | 24C/32T @ 3.2GHz",
        TotalRAM_GB: 128, RAM_Type: "DDR5", RAM_Slots: "4 used / 4 total",
        RAM_Modules: "32GB DDR5 DIMM Corsair CMK32GX5M1 @ 5600MHz ; 32GB DDR5 DIMM Corsair CMK32GX5M1 @ 5600MHz ; 32GB DDR5 DIMM Micron MT40A2G8TB-62 @ 5600MHz ; 32GB DDR5 DIMM Micron MT40A2G8TB-62 @ 5600MHz",
        GPU1_Model: "NVIDIA GeForce RTX 4090", GPU1_Driver: "560.94",
        GPU2_Model: "", GPU2_Driver: "",
        Disks: "Samsung 980 PRO [SSD] 1863GB SCSI ; Samsung 870 EVO [SSD] 953GB SCSI",
        Volumes: "C: 1862GB (1074GB free) ; D: 953GB (721GB free)",
        NICs: "Intel I226-V 954Mbps [10.20.5.42] ; Intel Wi-Fi 6E AX211 160MHz",
        PrimaryIP: "10.20.5.42"
      }
    },
    {
      machine_id: "a1b2c3d4-0001-0001-0001-000000000002",
      hostname: "EDIT-DAL-02",
      site: "Dallas",
      last_seen: now,
      manufacturer: "ASUS",
      model: "ProArt X670E-Creator",
      cpu: "AMD Ryzen 9 7950X | 16C/32T @ 4.5GHz",
      total_ram_gb: 64,
      ram_type: "DDR5",
      gpu1_model: "NVIDIA GeForce RTX 3090",
      os: "Microsoft Windows 11 Pro 10.0.26100",
      primary_ip: "10.20.5.43",
      data: {
        Manufacturer: "ASUS", Model: "ProArt X670E-Creator", Serial: "K5N0CX001234",
        Motherboard: "ASUS ProArt X670E-Creator WiFi", BIOS: "AMI 3402",
        OS: "Microsoft Windows 11 Pro 10.0.26100",
        CPU: "AMD Ryzen 9 7950X | 16C/32T @ 4.5GHz",
        TotalRAM_GB: 64, RAM_Type: "DDR5", RAM_Slots: "2 used / 4 total",
        RAM_Modules: "32GB DDR5 DIMM G.Skill Trident Z5 @ 6000MHz ; 32GB DDR5 DIMM G.Skill Trident Z5 @ 6000MHz",
        GPU1_Model: "NVIDIA GeForce RTX 3090", GPU1_Driver: "551.23",
        GPU2_Model: "", GPU2_Driver: "",
        Disks: "WD Black SN850X [SSD] 1863GB NVMe",
        Volumes: "C: 1863GB (890GB free)",
        NICs: "Intel I225-V 1Gbps [10.20.5.43]",
        PrimaryIP: "10.20.5.43"
      }
    },
    {
      machine_id: "a1b2c3d4-0001-0001-0001-000000000003",
      hostname: "EDIT-TUS-01",
      site: "Tustin",
      last_seen: now,
      manufacturer: "HP",
      model: "Z8 G4",
      cpu: "Intel(R) Xeon(R) W-2295 | 18C/36T @ 3.0GHz",
      total_ram_gb: 96,
      ram_type: "DDR4",
      gpu1_model: "NVIDIA Quadro RTX 6000",
      os: "Microsoft Windows 10 Pro 10.0.19045",
      primary_ip: "10.30.1.10",
      data: {
        Manufacturer: "HP", Model: "Z8 G4", Serial: "CZC0123456",
        Motherboard: "HP 81C7", BIOS: "Q71 Ver. 02.21",
        OS: "Microsoft Windows 10 Pro 10.0.19045",
        CPU: "Intel(R) Xeon(R) W-2295 | 18C/36T @ 3.0GHz",
        TotalRAM_GB: 96, RAM_Type: "DDR4", RAM_Slots: "6 used / 12 total",
        RAM_Modules: "16GB DDR4 RDIMM Samsung M393A2K43CB2 @ 2933MHz ; 16GB DDR4 RDIMM Samsung M393A2K43CB2 @ 2933MHz ; 16GB DDR4 RDIMM Samsung M393A2K43CB2 @ 2933MHz ; 16GB DDR4 RDIMM Samsung M393A2K43CB2 @ 2933MHz ; 16GB DDR4 RDIMM Samsung M393A2K43CB2 @ 2933MHz ; 16GB DDR4 RDIMM Samsung M393A2K43CB2 @ 2933MHz",
        GPU1_Model: "NVIDIA Quadro RTX 6000", GPU1_Driver: "551.76",
        GPU2_Model: "", GPU2_Driver: "",
        Disks: "HP Z Turbo Drive G2 [SSD] 512GB NVMe ; Seagate Barracuda [HDD] 3726GB SCSI",
        Volumes: "C: 512GB (180GB free) ; D: 3726GB (2100GB free)",
        NICs: "Intel I210-T1 GbE [10.30.1.10] ; Mellanox ConnectX-5 10GbE [10.30.1.11]",
        PrimaryIP: "10.30.1.10"
      }
    },
    {
      machine_id: "a1b2c3d4-0001-0001-0001-000000000004",
      hostname: "EDIT-TUS-02",
      site: "Tustin",
      last_seen: stale,
      manufacturer: "Dell",
      model: "Precision 7920",
      cpu: "Intel(R) Xeon(R) Silver 4214 | 12C/24T @ 2.2GHz",
      total_ram_gb: 32,
      ram_type: "DDR4",
      gpu1_model: "NVIDIA Quadro P4000",
      os: "Microsoft Windows 10 Pro 10.0.18363",
      primary_ip: "10.30.1.12",
      data: {
        Manufacturer: "Dell", Model: "Precision 7920", Serial: "8X4TJ72",
        Motherboard: "Dell 0GDG8Y", BIOS: "Dell 1.16.1",
        OS: "Microsoft Windows 10 Pro 10.0.18363",
        CPU: "Intel(R) Xeon(R) Silver 4214 | 12C/24T @ 2.2GHz",
        TotalRAM_GB: 32, RAM_Type: "DDR4", RAM_Slots: "4 used / 12 total",
        RAM_Modules: "8GB DDR4 RDIMM Samsung @ 2933MHz ; 8GB DDR4 RDIMM Samsung @ 2933MHz ; 8GB DDR4 RDIMM Samsung @ 2933MHz ; 8GB DDR4 RDIMM Samsung @ 2933MHz",
        GPU1_Model: "NVIDIA Quadro P4000", GPU1_Driver: "512.78",
        GPU2_Model: "", GPU2_Driver: "",
        Disks: "HGST Ultrastar DC HC320 [HDD] 7452GB SCSI ; HGST Ultrastar DC HC320 [HDD] 7452GB SCSI",
        Volumes: "C: 500GB (120GB free) ; D: 14000GB (8800GB free)",
        NICs: "Broadcom NetXtreme BCM5720 1GbE [10.30.1.12]",
        PrimaryIP: "10.30.1.12"
      }
    },
    {
      machine_id: "a1b2c3d4-0001-0001-0001-000000000005",
      hostname: "EDIT-NSH-01",
      site: "Nashville",
      last_seen: now,
      manufacturer: "Supermicro",
      model: "SYS-740GP-TNRT",
      cpu: "Intel(R) Core(TM) i9-13900K | 24C/32T @ 3.0GHz",
      total_ram_gb: 128,
      ram_type: "DDR5",
      gpu1_model: "NVIDIA RTX A4000",
      os: "Microsoft Windows 11 Pro 10.0.22631",
      primary_ip: "10.40.2.5",
      data: {
        Manufacturer: "Supermicro", Model: "SYS-740GP-TNRT", Serial: "SM20230412",
        Motherboard: "Supermicro X13SAE-F", BIOS: "American Megatrends 1.4",
        OS: "Microsoft Windows 11 Pro 10.0.22631",
        CPU: "Intel(R) Core(TM) i9-13900K | 24C/32T @ 3.0GHz",
        TotalRAM_GB: 128, RAM_Type: "DDR5", RAM_Slots: "4 used / 8 total",
        RAM_Modules: "32GB DDR5 RDIMM Kingston KSM56R46BS4PMI @ 5600MHz ; 32GB DDR5 RDIMM Kingston KSM56R46BS4PMI @ 5600MHz ; 32GB DDR5 RDIMM Kingston KSM56R46BS4PMI @ 5600MHz ; 32GB DDR5 RDIMM Kingston KSM56R46BS4PMI @ 5600MHz",
        GPU1_Model: "NVIDIA RTX A4000", GPU1_Driver: "551.61",
        GPU2_Model: "", GPU2_Driver: "",
        Disks: "Samsung 990 PRO [SSD] 1863GB NVMe ; WD Red Pro [HDD] 7452GB SCSI",
        Volumes: "C: 1863GB (950GB free) ; D: 7452GB (5200GB free)",
        NICs: "Intel X550-T2 10GbE [10.40.2.5] ; Intel X550-T2 10GbE [10.40.2.6]",
        PrimaryIP: "10.40.2.5"
      }
    },
  ]);

  logger.info("Seeded 5 sample machines");
}
