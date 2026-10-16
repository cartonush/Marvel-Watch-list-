export const rank = (uid, user, owner) => uid === owner ? 3 : user?.Fmanage ? 2 : user?.manage ? 1 : 0;

export function recipients(type, data, users, owner) {
  const approved = Object.entries(users).filter(([uid,u]) => uid === owner || u.status === 'approved' && u.view === true);
  const staff = minimum => approved.filter(([uid,u]) => rank(uid,u,owner) >= minimum).map(([uid]) => uid);
  const all = () => approved.map(([uid]) => uid);
  const person = uid => typeof uid === 'string' && users[uid] ? [uid] : [];
  switch (type) {
    case 'registration': return staff(2);
    case 'titleRequest': return staff(1).filter(uid => uid !== data.requestedBy);
    case 'titleRequestResolved': return person(data.requestedBy);
    case 'release': case 'search': case 'titleAdded': case 'titleRemoved': return all();
    case 'message': return person(data.to);
    case 'deletionRequest': return staff(2).filter(uid => uid !== data.requestedBy);
    case 'deletionResolved': return [...new Set([...person(data.requestedBy),...staff(2)])];
    case 'friendRequest': return person(data.a === data.requestedBy ? data.b : data.a);
    case 'friendAccepted': return [...new Set([...person(data.a),...person(data.b)])];
    case 'role': {
      const previous = Math.max(1, Number(data.previousRank)||0);
      const current = Math.max(1, rank(data.uid,users[data.uid],owner));
      const minimum = Math.min(previous,current);
      return [...new Set([...person(data.uid),...staff(minimum)])];
    }
    default: return [];
  }
}
