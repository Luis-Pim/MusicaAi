(function(root) {
'use strict';
const roles = ['admin', 'encarregado', 'instrutor', 'aluno'];
function manages(actor, target) {
  if (!actor || actor.active !== true || !target || !roles.includes(target.role)) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'encarregado') return ['instrutor','aluno'].includes(target.role);
  return actor.role === 'instrutor' && target.role === 'aluno' && target.instructorId === actor.uid;
}
function canCreate(actor, role) {
  return manages(actor, {role, instructorId:actor?.uid});
}
function canReadStudent(actor, target) {
  return actor?.active === true && (actor.uid === target?.uid || ['admin','encarregado'].includes(actor.role) || actor.role === 'instrutor' && target?.role === 'aluno' && target.instructorId === actor.uid);
}
const api = {roles, manages, canCreate, canReadStudent};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PVAccess = api;
})(typeof window !== 'undefined' ? window : globalThis);
