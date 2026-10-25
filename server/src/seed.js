// Demo accounts for evaluation: one student with sample data and one administrator.
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { SavedStructure } from './models/SavedStructure.js';
import { StudyNote } from './models/StudyNote.js';

export const DEMO_ACCOUNTS = [
  { label: 'Student', displayName: 'Riya Sharma', email: 'riya.sharma@humanatlas.test', password: 'Student@Atlas2026', role: 'user' },
  { label: 'Administrator', displayName: 'Adhyayan Sonare', email: 'admin@humanatlas.test', password: 'Admin@Atlas2026', role: 'admin' },
];

// Real structure ids from client/public/models/atlas.json.
const SAMPLE_SAVED = [
  { structureId: 'FMA7088', name: 'heart', system: 'cardiac', pieces: 83 },
  { structureId: 'FMA50801', name: 'brain', system: 'nervous', pieces: 59 },
  { structureId: 'FMA7310', name: 'left lung', system: 'respiratory', pieces: 124 },
  { structureId: 'FMA7197', name: 'liver', system: 'digestive', pieces: 60 },
  { structureId: 'FMA46565', name: 'skull', system: 'skeletal', pieces: 43 },
];
const SAMPLE_NOTES = [
  { structureId: 'FMA7088', structureName: 'heart', content: 'Four chambers: right atrium and ventricle pump to the lungs, left atrium and ventricle pump to the body.' },
  { structureId: 'FMA7088', structureName: 'heart', content: 'Valve order (blood flow): tricuspid, pulmonary, mitral, aortic.' },
  { structureId: 'FMA7310', structureName: 'left lung', content: 'Two lobes on the left (three on the right) to leave room for the heart: the cardiac notch.' },
  { structureId: 'FMA46565', structureName: 'skull', content: 'Cranium protects the brain; facial bones form the orbits, nasal cavity and jaw.' },
];

/** Creates any missing demo accounts. With reset, restores their passwords, roles and sample data. */
export async function ensureDemoAccounts({ reset = false } = {}) {
  const created = [];
  for (const acc of DEMO_ACCOUNTS) {
    let user = await User.findOne({ email: acc.email });
    if (!user || reset) {
      const passwordHash = await bcrypt.hash(acc.password, 12);
      if (user) {
        user.set({ displayName: acc.displayName, role: acc.role, passwordHash });
        await user.save();
      } else {
        user = await User.create({ displayName: acc.displayName, email: acc.email, passwordHash, role: acc.role });
        created.push(acc.email);
      }
      if (acc.role === 'user') {
        if (reset) {
          await SavedStructure.deleteMany({ user: user._id });
          await StudyNote.deleteMany({ user: user._id });
        }
        for (const s of SAMPLE_SAVED) {
          if (!(await SavedStructure.exists({ user: user._id, structureId: s.structureId }))) await SavedStructure.create({ user: user._id, ...s });
        }
        if ((await StudyNote.countDocuments({ user: user._id })) === 0) {
          await StudyNote.insertMany(SAMPLE_NOTES.map((n) => ({ user: user._id, ...n })));
        }
      }
    }
  }
  return created;
}
