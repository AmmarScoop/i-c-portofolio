/**
 * Seed script: populates demo data for the Kids Tech Academy system.
 * Run with: npm run db:seed (after `npm run db:push`)
 *
 * Creates:
 *  - 1 admin user
 *  - 6 courses (3 Programming, 3 Robotics), each with 3 levels x 4 sessions
 *  - 5 sample children, a few enrollments
 *  - 1 demo child login account
 *  - A handful of attendance records (to demonstrate auto-portfolio generation)
 *  - A set of badges, including auto-trigger rules, plus one manual award
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncPortfolioForAttendance } from "../src/lib/portfolio";
import { evaluateBadgesForChild } from "../src/lib/badges";
import type { OutputType, Track } from "../src/lib/enums";

const prisma = new PrismaClient();

type SessionDef = {
  title: string;
  outputType: OutputType;
  outputName: string;
  outputDescription: string;
  productImageUrl: string;
  productImageAlt: string;
};
type LevelDef = { name: string; description: string; price: number; sessions: SessionDef[] };
type CourseDef = { name: string; track: Track; minAge: number; maxAge: number; description: string; levels: LevelDef[] };

// Local placeholder photos under public/seed-images/ stand in for real "what
// the child built" photos an admin would upload via the session form. Using
// committed local files (rather than external URLs) means the seed never
// references a broken link, online or offline.
const PRODUCT_IMAGE_BY_TYPE: Record<OutputType, string> = {
  ROBOT: "/seed-images/robot.svg",
  APP: "/seed-images/app.svg",
  GAME: "/seed-images/game.svg",
  STORY: "/seed-images/story.svg",
  PROJECT: "/seed-images/project.svg",
  OTHER: "/seed-images/project.svg",
};

function fourSessions(prefix: string, type: OutputType, items: string[]): SessionDef[] {
  return items.map((item, i) => ({
    title: `${prefix} - Week ${i + 1}`,
    outputType: type,
    outputName: item,
    outputDescription: `Output created during week ${i + 1} of ${prefix}.`,
    productImageUrl: type === "ROBOT" && i % 2 === 1 ? "/seed-images/robot-2.svg" : PRODUCT_IMAGE_BY_TYPE[type],
    productImageAlt: `Photo of the ${item.toLowerCase()} built in ${prefix}`,
  }));
}

const COURSES: CourseDef[] = [
  {
    name: "Scratch",
    track: "PROGRAMMING",
    minAge: 6,
    maxAge: 9,
    description: "Introduction to visual block-based programming with Scratch.",
    levels: [
      { name: "Foundations", description: "Basic blocks, motion, and events.", price: 600, sessions: fourSessions("Scratch L1", "GAME", ["Cat Chase Game", "Maze Runner", "Bouncing Ball", "Mini Quiz Game"]) },
      { name: "Storytelling", description: "Animations, costumes, and dialogue.", price: 650, sessions: fourSessions("Scratch L2", "STORY", ["Animated Greeting Card", "Two-Character Dialogue", "Interactive Story", "Story With Choices"]) },
      { name: "Mini Projects", description: "Combine logic and creativity into bigger projects.", price: 700, sessions: fourSessions("Scratch L3", "PROJECT", ["Pong Game", "Drawing Pad", "Music Maker", "Final Showcase Project"]) },
    ],
  },
  {
    name: "MIT App Inventor",
    track: "PROGRAMMING",
    minAge: 10,
    maxAge: 13,
    description: "Build real Android apps using MIT App Inventor's block interface.",
    levels: [
      { name: "App Basics", description: "Screens, buttons, and layouts.", price: 800, sessions: fourSessions("App Inventor L1", "APP", ["Hello World App", "Simple Calculator", "Color Picker App", "Tip Calculator"]) },
      { name: "Interactive Apps", description: "Sensors, media, and navigation.", price: 850, sessions: fourSessions("App Inventor L2", "APP", ["Photo Filter App", "Sound Recorder App", "Quiz App", "Multi-screen Notes App"]) },
      { name: "Capstone Apps", description: "Plan and build a complete original app.", price: 900, sessions: fourSessions("App Inventor L3", "APP", ["To-Do List App", "Mini Game App", "Weather Lookup App", "Final Capstone App"]) },
    ],
  },
  {
    name: "Python Basics",
    track: "PROGRAMMING",
    minAge: 13,
    maxAge: 17,
    description: "Real-world programming fundamentals using Python.",
    levels: [
      { name: "Syntax & Logic", description: "Variables, conditionals, loops.", price: 900, sessions: fourSessions("Python L1", "PROJECT", ["Number Guessing Game", "Simple Calculator Script", "Text Adventure Intro", "Loop-based Pattern Generator"]) },
      { name: "Data Structures", description: "Lists, dictionaries, functions.", price: 950, sessions: fourSessions("Python L2", "PROJECT", ["Contact Book CLI", "To-Do List Script", "Word Frequency Counter", "Simple Quiz Engine"]) },
      { name: "Mini Applications", description: "Combine concepts into small applications.", price: 1000, sessions: fourSessions("Python L3", "PROJECT", ["Rock Paper Scissors Game", "Expense Tracker", "Basic Chatbot", "Final Python Project"]) },
    ],
  },
  {
    name: "Junior Robotics",
    track: "ROBOTICS",
    minAge: 5,
    maxAge: 7,
    description: "Hands-on intro to robots and motion for young builders.",
    levels: [
      { name: "Building Blocks", description: "First builds and motors.", price: 700, sessions: fourSessions("Junior Robotics L1", "ROBOT", ["Rolling Car Robot", "Spinning Top Robot", "Push Robot", "Simple Vehicle Robot"]) },
      { name: "Moving Robots", description: "Gears and simple mechanisms.", price: 750, sessions: fourSessions("Junior Robotics L2", "ROBOT", ["Gear Car Robot", "Walking Animal Robot", "Crane Robot", "Catapult Robot"]) },
      { name: "Robot Friends", description: "Decorate and personalize robot creations.", price: 800, sessions: fourSessions("Junior Robotics L3", "ROBOT", ["Animal-themed Robot", "Robot Buddy", "Race Car Robot", "Final Robot Showcase"]) },
    ],
  },
  {
    name: "LEGO Robotics",
    track: "ROBOTICS",
    minAge: 8,
    maxAge: 12,
    description: "Build and program robots using LEGO Mindstorms/Spike kits.",
    levels: [
      { name: "Build & Program I", description: "Motors, sensors, basic programming blocks.", price: 950, sessions: fourSessions("LEGO Robotics L1", "ROBOT", ["Line Follower Robot", "Obstacle Avoider Robot", "Color Sorter Robot", "Remote Control Robot"]) },
      { name: "Build & Program II", description: "Sensors fusion and more advanced logic.", price: 1000, sessions: fourSessions("LEGO Robotics L2", "ROBOT", ["Maze Solver Robot", "Sumo Battle Robot", "Light-Seeking Robot", "Sound-Activated Robot"]) },
      { name: "Robotics Challenge", description: "Apply skills to competition-style challenges.", price: 1050, sessions: fourSessions("LEGO Robotics L3", "ROBOT", ["Robot Arm", "Delivery Robot", "Soccer Robot", "Final Challenge Robot"]) },
    ],
  },
  {
    name: "Advanced Robotics",
    track: "ROBOTICS",
    minAge: 12,
    maxAge: 17,
    description: "Microcontrollers, sensors, and real engineering projects.",
    levels: [
      { name: "Microcontroller Basics", description: "Intro to Arduino/microcontroller programming.", price: 1100, sessions: fourSessions("Advanced Robotics L1", "ROBOT", ["Blinking LED Circuit", "Sensor-based Alarm", "Servo Motor Control", "Basic Sensor Robot"]) },
      { name: "Sensors & Automation", description: "Integrate multiple sensors for automation.", price: 1150, sessions: fourSessions("Advanced Robotics L2", "ROBOT", ["Temperature Monitor", "Automatic Plant Waterer", "Ultrasonic Distance Robot", "Smart Light System"]) },
      { name: "Engineering Capstone", description: "Design and build an original robotics project.", price: 1200, sessions: fourSessions("Advanced Robotics L3", "PROJECT", ["Robotic Claw", "Autonomous Cart", "Weather Station", "Final Capstone Robot"]) },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  // ---------- Admin user ----------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@academy.test").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Academy Admin", email: adminEmail, passwordHash: adminPasswordHash, role: "ADMIN" },
  });
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);

  // ---------- Courses, levels, sessions ----------
  const createdCourses: Record<string, { courseId: string; levelIds: string[]; sessionIdsByLevel: string[][] }> = {};

  for (const c of COURSES) {
    const course = await prisma.course.create({
      data: { name: c.name, track: c.track, minAge: c.minAge, maxAge: c.maxAge, description: c.description, isActive: true },
    });
    const levelIds: string[] = [];
    const sessionIdsByLevel: string[][] = [];

    for (let li = 0; li < c.levels.length; li++) {
      const lvl = c.levels[li];
      const level = await prisma.courseLevel.create({
        data: { courseId: course.id, levelNumber: li + 1, name: lvl.name, description: lvl.description, price: lvl.price },
      });
      levelIds.push(level.id);

      const sessionIds: string[] = [];
      for (let si = 0; si < lvl.sessions.length; si++) {
        const s = lvl.sessions[si];
        const session = await prisma.courseSession.create({
          data: {
            levelId: level.id,
            sessionNumber: si + 1,
            title: s.title,
            description: `Session ${si + 1} of ${lvl.name}.`,
            outputType: s.outputType,
            outputName: s.outputName,
            outputDescription: s.outputDescription,
            productImageUrl: s.productImageUrl,
            productImageAlt: s.productImageAlt,
          },
        });
        sessionIds.push(session.id);
      }
      sessionIdsByLevel.push(sessionIds);
    }
    createdCourses[c.name] = { courseId: course.id, levelIds, sessionIdsByLevel };
  }
  console.log(`Created ${COURSES.length} courses with levels & sessions.`);

  // ---------- Badges ----------
  const badgeFirstSteps = await prisma.badge.create({
    data: { name: "First Steps", description: "Attended your very first session!", icon: "👣", triggerType: "ATTENDANCE_COUNT", triggerValue: 1 },
  });
  const badgeBuilder = await prisma.badge.create({
    data: { name: "Builder", description: "Created 5 portfolio projects.", icon: "🛠️", triggerType: "PROJECT_COUNT", triggerValue: 5 },
  });
  const badgeLevelUp = await prisma.badge.create({
    data: { name: "Level Up!", description: "Completed an entire level.", icon: "⬆️", triggerType: "LEVEL_COMPLETED", triggerValue: 1 },
  });
  const badgeGraduate = await prisma.badge.create({
    data: { name: "Course Graduate", description: "Completed a full course.", icon: "🎓", triggerType: "COURSE_COMPLETED", triggerValue: 1 },
  });
  const badgeStar = await prisma.badge.create({
    data: { name: "Star of the Month", description: "Awarded manually for outstanding effort.", icon: "🌟", triggerType: "MANUAL" },
  });
  console.log("Created 5 badges.");

  // ---------- Children ----------
  // Includes the new student-management fields (emergency contact, school,
  // preferred track, skill level) on a few children to demonstrate them.
  const childrenData = [
    {
      fullName: "Sara Ahmed", parentName: "Ahmed Mostafa", parentPhone: "0100000001", parentEmail: "ahmed@example.com", age: 8,
      emergencyContactName: "Mona Mostafa", emergencyContactPhone: "0122222221", schoolName: "Riverside Language School",
      preferredTrack: "PROGRAMMING", skillLevel: "BEGINNER",
    },
    {
      fullName: "Yousef Khaled", parentName: "Khaled Said", parentPhone: "0100000002", parentEmail: "khaled@example.com", age: 11,
      emergencyContactName: "Sherif Said", emergencyContactPhone: "0122222222", schoolName: "Future Stars School",
      preferredTrack: "PROGRAMMING", skillLevel: "INTERMEDIATE",
    },
    {
      fullName: "Laila Hassan", parentName: "Hassan Omar", parentPhone: "0100000003", parentEmail: "hassan@example.com", age: 14,
      schoolName: "Modern English School", preferredTrack: "PROGRAMMING", skillLevel: "ADVANCED",
    },
    {
      fullName: "Omar Tarek", parentName: "Tarek Fathy", parentPhone: "0100000004", parentEmail: "tarek@example.com", age: 6,
      emergencyContactName: "Heba Fathy", emergencyContactPhone: "0122222224",
      preferredTrack: "ROBOTICS", skillLevel: "BEGINNER",
    },
    {
      fullName: "Nour Adel", parentName: "Adel Samir", parentPhone: "0100000005", parentEmail: "adel@example.com", age: 10,
      schoolName: "Cairo English School", preferredTrack: "ROBOTICS", skillLevel: "INTERMEDIATE",
    },
  ];
  const children = [];
  for (const c of childrenData) {
    children.push(await prisma.child.create({ data: c }));
  }
  console.log(`Created ${children.length} children.`);

  // ---------- Sample child notes (internal admin record-keeping demo) ----------
  await prisma.childNote.createMany({
    data: [
      { childId: children[0].id, type: "PROGRESS", note: "Picking up Scratch logic very quickly, especially loops.", createdBy: "Academy Admin" },
      { childId: children[1].id, type: "BEHAVIOR", note: "Great team player, helps classmates debug their apps.", createdBy: "Academy Admin" },
      { childId: children[3].id, type: "PARENT_COMMUNICATION", note: "Called parent to discuss makeup session after an absence.", createdBy: "Academy Admin" },
      { childId: children[1].id, type: "PAYMENT", note: "Parent asked about installment plan for Level 2.", createdBy: "Academy Admin" },
    ],
  });
  console.log("Seeded sample child notes.");

  // Demo child login (Sara) -> linked to her Child record.
  const childPassword = "Child123!";
  const childPasswordHash = await bcrypt.hash(childPassword, 10);
  const childUser = await prisma.user.create({
    data: { name: children[0].fullName, email: "sara@academy.test", passwordHash: childPasswordHash, role: "CHILD" },
  });
  await prisma.child.update({ where: { id: children[0].id }, data: { userId: childUser.id } });
  console.log(`Demo child login: sara@academy.test / ${childPassword}`);

  // ---------- Enrollments ----------
  const scratch = createdCourses["Scratch"];
  const appInventor = createdCourses["MIT App Inventor"];
  const python = createdCourses["Python Basics"];
  const juniorRobotics = createdCourses["Junior Robotics"];
  const legoRobotics = createdCourses["LEGO Robotics"];

  const enrollSara = await prisma.enrollment.create({
    data: { childId: children[0].id, courseId: scratch.courseId, currentLevelId: scratch.levelIds[0], status: "ACTIVE" },
  });
  const enrollYousef = await prisma.enrollment.create({
    data: { childId: children[1].id, courseId: appInventor.courseId, currentLevelId: appInventor.levelIds[0], status: "ACTIVE" },
  });
  const enrollLaila = await prisma.enrollment.create({
    data: { childId: children[2].id, courseId: python.courseId, currentLevelId: python.levelIds[0], status: "ACTIVE" },
  });
  const enrollOmar = await prisma.enrollment.create({
    data: { childId: children[3].id, courseId: juniorRobotics.courseId, currentLevelId: juniorRobotics.levelIds[0], status: "ACTIVE" },
  });
  const enrollNour = await prisma.enrollment.create({
    data: { childId: children[4].id, courseId: legoRobotics.courseId, currentLevelId: legoRobotics.levelIds[0], status: "ACTIVE" },
  });
  console.log("Created 5 enrollments.");

  // ---------- Sample attendance (drives auto-portfolio + badges) ----------
  // Sara attends her first 2 Scratch L1 sessions (PRESENT), demonstrating auto portfolio creation.
  const saraSessions = scratch.sessionIdsByLevel[0];
  for (const sessionId of saraSessions.slice(0, 2)) {
    await prisma.attendance.create({
      data: { childId: children[0].id, sessionId, enrollmentId: enrollSara.id, status: "PRESENT" },
    });
    await syncPortfolioForAttendance({ childId: children[0].id, enrollmentId: enrollSara.id, sessionId, status: "PRESENT" });
  }
  // Yousef completes his entire first App Inventor level -> should trigger "Level Up!" badge.
  const yousefSessions = appInventor.sessionIdsByLevel[0];
  for (const sessionId of yousefSessions) {
    await prisma.attendance.create({
      data: { childId: children[1].id, sessionId, enrollmentId: enrollYousef.id, status: "PRESENT" },
    });
    await syncPortfolioForAttendance({ childId: children[1].id, enrollmentId: enrollYousef.id, sessionId, status: "PRESENT" });
  }
  // Omar attends 1 session then is marked absent for the 2nd (demonstrates soft-deactivation rule isn't triggered since it was never present).
  const omarSessions = juniorRobotics.sessionIdsByLevel[0];
  await prisma.attendance.create({ data: { childId: children[3].id, sessionId: omarSessions[0], enrollmentId: enrollOmar.id, status: "PRESENT" } });
  await syncPortfolioForAttendance({ childId: children[3].id, enrollmentId: enrollOmar.id, sessionId: omarSessions[0], status: "PRESENT" });
  await prisma.attendance.create({ data: { childId: children[3].id, sessionId: omarSessions[1], enrollmentId: enrollOmar.id, status: "ABSENT" } });

  console.log("Seeded sample attendance + auto-generated portfolio items.");

  // ---------- Badge evaluation for all children with attendance ----------
  for (const child of [children[0], children[1], children[3]]) {
    const awarded = await evaluateBadgesForChild(child.id);
    if (awarded.length) console.log(`Auto-awarded ${awarded.length} badge(s) to ${child.fullName}`);
  }

  // Manually award the "Star of the Month" badge to Sara, as an example of manual assignment.
  await prisma.childBadge.create({
    data: { childId: children[0].id, badgeId: badgeStar.id, awardedBy: "Academy Admin", reason: "Great enthusiasm in class!" },
  });

  // ---------- Sample payments ----------
  await prisma.payment.create({
    data: { childId: children[0].id, enrollmentId: enrollSara.id, levelId: scratch.levelIds[0], amount: 600, status: "PAID", paidAt: new Date() },
  });
  await prisma.payment.create({
    data: { childId: children[1].id, enrollmentId: enrollYousef.id, levelId: appInventor.levelIds[0], amount: 800, status: "UNPAID" },
  });
  await prisma.payment.create({
    data: { childId: children[4].id, enrollmentId: enrollNour.id, levelId: legoRobotics.levelIds[0], amount: 950, status: "PARTIAL", notes: "Paid half, remaining due next week." },
  });
  console.log("Seeded sample payments.");

  console.log("\nSeed complete. Demo logins:");
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Child: sara@academy.test / ${childPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
