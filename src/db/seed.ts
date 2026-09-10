import "dotenv/config";
import { seedDemoData } from "./seed-data";

seedDemoData()
  .then(() => {
    console.log("");
    console.log("Login credentials:");
    console.log("  Admin:      admin@districtgym.com / admin123");
    console.log("  Manager:    manager@districtgym.com / manager123");
    console.log("  Front desk: frontdesk@districtgym.com / frontdesk123");
    console.log("  Trainer:    trainer@districtgym.com / trainer123");
    console.log("  Member (e.g. jamie.oliver@example.com) / member123");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
