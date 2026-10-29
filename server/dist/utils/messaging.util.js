import { Types } from 'mongoose';
import { User } from '../models/User.model.js';
import { Student } from '../models/Student.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Parent } from '../models/Parent.model.js';
import { Enrollment } from '../models/Enrollment.model.js';
import { SubjectAssignment } from '../models/SubjectAssignment.model.js';
/**
 * Checks if a user is an active participant in a conversation
 */
export const isParticipantInConversation = (conversation, userId) => {
    if (!conversation || !conversation.participants)
        return false;
    const targetId = userId.toString();
    return conversation.participants.some((p) => p.userId && p.userId.toString() === targetId);
};
/**
 * Validates whether initiatorUser is permitted to start a conversation with targetUser
 * based on role policies and verified database relationships.
 */
export const canInitiateConversation = async (schoolId, initiator, target) => {
    // 1. Strict School-level tenant barrier
    if (schoolId.toString() !== target.schoolId.toString()) {
        return {
            allowed: false,
            reason: 'Cross-school messaging is strictly forbidden.',
        };
    }
    // 2. Cannot message self
    if (initiator._id.toString() === target._id.toString()) {
        return {
            allowed: false,
            reason: 'Cannot start a conversation with yourself.',
        };
    }
    const iRole = initiator.role;
    const tRole = target.role;
    // 3. Admin / Super Admin can contact anyone in their school
    if (iRole === 'admin' || iRole === 'super_admin' || tRole === 'admin' || tRole === 'super_admin') {
        return { allowed: true };
    }
    // 4. Faculty / Teacher to Faculty / Teacher
    if (iRole === 'teacher' && tRole === 'teacher') {
        return { allowed: true };
    }
    // 5. Faculty / Teacher to Parent:
    // Teacher can message parents of students in classes/sections assigned to this teacher
    if (iRole === 'teacher' && tRole === 'parent') {
        const teacherProfile = await Teacher.findOne({ schoolId, userId: initiator._id });
        if (!teacherProfile)
            return { allowed: false, reason: 'Teacher profile not found.' };
        const parentProfile = await Parent.findOne({ schoolId, userId: target._id });
        if (!parentProfile || !parentProfile.children || parentProfile.children.length === 0) {
            return { allowed: false, reason: 'Parent profile or linked wards not found.' };
        }
        // Get ward student IDs
        const wardProfileIds = parentProfile.children.map((c) => c.studentProfileId);
        const wardEnrollments = await Enrollment.find({
            schoolId,
            studentId: { $in: wardProfileIds },
            status: 'enrolled',
        });
        if (wardEnrollments.length === 0) {
            return { allowed: false, reason: 'Parent wards have no active enrollment.' };
        }
        const wardClassIds = wardEnrollments.map((e) => e.classId);
        // Check if teacher is assigned to any of these classes
        const assignment = await SubjectAssignment.findOne({
            schoolId,
            teacherId: teacherProfile._id,
            classId: { $in: wardClassIds },
            status: 'active',
        });
        if (!assignment) {
            return {
                allowed: false,
                reason: 'Teachers may only contact parents of students in their assigned classes.',
            };
        }
        return { allowed: true };
    }
    // 6. Parent to Teacher:
    // Parent can message teachers assigned to classes their ward is enrolled in
    if (iRole === 'parent' && tRole === 'teacher') {
        const parentProfile = await Parent.findOne({ schoolId, userId: initiator._id });
        if (!parentProfile || !parentProfile.children || parentProfile.children.length === 0) {
            return { allowed: false, reason: 'Parent profile or linked wards not found.' };
        }
        const teacherProfile = await Teacher.findOne({ schoolId, userId: target._id });
        if (!teacherProfile)
            return { allowed: false, reason: 'Teacher profile not found.' };
        const wardProfileIds = parentProfile.children.map((c) => c.studentProfileId);
        const wardEnrollments = await Enrollment.find({
            schoolId,
            studentId: { $in: wardProfileIds },
            status: 'enrolled',
        });
        if (wardEnrollments.length === 0) {
            return { allowed: false, reason: 'Parent wards have no active enrollment.' };
        }
        const wardClassIds = wardEnrollments.map((e) => e.classId);
        const assignment = await SubjectAssignment.findOne({
            schoolId,
            teacherId: teacherProfile._id,
            classId: { $in: wardClassIds },
            status: 'active',
        });
        if (!assignment) {
            return {
                allowed: false,
                reason: 'Parents may only contact teachers assigned to their children.',
            };
        }
        return { allowed: true };
    }
    // 7. Teacher to Student:
    // Teacher can message students enrolled in their assigned classes
    if (iRole === 'teacher' && tRole === 'student') {
        const teacherProfile = await Teacher.findOne({ schoolId, userId: initiator._id });
        const studentProfile = await Student.findOne({ schoolId, userId: target._id });
        if (!teacherProfile || !studentProfile) {
            return { allowed: false, reason: 'Teacher or student profile not found.' };
        }
        const studentEnrollment = await Enrollment.findOne({
            schoolId,
            studentId: studentProfile._id,
            status: 'enrolled',
        });
        if (!studentEnrollment) {
            return { allowed: false, reason: 'Student is not actively enrolled in any class.' };
        }
        const assignment = await SubjectAssignment.findOne({
            schoolId,
            teacherId: teacherProfile._id,
            classId: studentEnrollment.classId,
            status: 'active',
        });
        if (!assignment) {
            return {
                allowed: false,
                reason: 'Teachers may only contact students in their assigned classes.',
            };
        }
        return { allowed: true };
    }
    // 8. Student to Teacher:
    // Student can message teachers assigned to their enrolled class
    if (iRole === 'student' && tRole === 'teacher') {
        const studentProfile = await Student.findOne({ schoolId, userId: initiator._id });
        const teacherProfile = await Teacher.findOne({ schoolId, userId: target._id });
        if (!studentProfile || !teacherProfile) {
            return { allowed: false, reason: 'Student or teacher profile not found.' };
        }
        const studentEnrollment = await Enrollment.findOne({
            schoolId,
            studentId: studentProfile._id,
            status: 'enrolled',
        });
        if (!studentEnrollment) {
            return { allowed: false, reason: 'Student is not actively enrolled in any class.' };
        }
        const assignment = await SubjectAssignment.findOne({
            schoolId,
            teacherId: teacherProfile._id,
            classId: studentEnrollment.classId,
            status: 'active',
        });
        if (!assignment) {
            return {
                allowed: false,
                reason: 'Students may only contact teachers assigned to their class.',
            };
        }
        return { allowed: true };
    }
    // All other role combinations are disallowed by policy
    return {
        allowed: false,
        reason: `Direct messaging between ${iRole} and ${tRole} is not permitted by school communication policy.`,
    };
};
/**
 * Retrieves the authorized list of contacts a user can initiate communication with
 */
export const getAuthorizedContacts = async (schoolId, currentUser) => {
    const role = currentUser.role;
    // 1. Admins can message any active user in the school
    if (role === 'admin' || role === 'super_admin') {
        const users = await User.find({
            schoolId,
            _id: { $ne: currentUser._id },
            status: 'active',
        })
            .select('_id name email role')
            .lean();
        return users.map((u) => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
        }));
    }
    // 2. Teachers can message: Admins, fellow Teachers, and parents/students in assigned classes
    if (role === 'teacher') {
        const teacherProfile = await Teacher.findOne({ schoolId, userId: currentUser._id });
        const contactUserIds = new Set();
        // Add school admins and teachers
        const staff = await User.find({
            schoolId,
            role: { $in: ['admin', 'super_admin', 'teacher'] },
            _id: { $ne: currentUser._id },
            status: 'active',
        })
            .select('_id name email role')
            .lean();
        staff.forEach((s) => contactUserIds.add(s._id.toString()));
        if (teacherProfile) {
            // Find classes teacher is assigned to
            const assignments = await SubjectAssignment.find({
                schoolId,
                teacherId: teacherProfile._id,
                status: 'active',
            }).select('classId');
            const classIds = assignments.map((a) => a.classId);
            if (classIds.length > 0) {
                // Find enrolled students
                const enrollments = await Enrollment.find({
                    schoolId,
                    classId: { $in: classIds },
                    status: 'enrolled',
                }).select('studentId');
                const studentProfileIds = enrollments.map((e) => e.studentId);
                // Find students' user accounts
                const students = await Student.find({
                    schoolId,
                    _id: { $in: studentProfileIds },
                }).select('userId');
                students.forEach((s) => s.userId && contactUserIds.add(s.userId.toString()));
                // Find parents of these students
                const parents = await Parent.find({
                    schoolId,
                    'children.studentProfileId': { $in: studentProfileIds },
                }).select('userId');
                parents.forEach((p) => p.userId && contactUserIds.add(p.userId.toString()));
            }
        }
        const contacts = await User.find({
            schoolId,
            _id: { $in: Array.from(contactUserIds).map((id) => new Types.ObjectId(id)) },
            status: 'active',
        })
            .select('_id name email role')
            .lean();
        return contacts.map((c) => ({
            _id: c._id,
            name: c.name,
            email: c.email,
            role: c.role,
        }));
    }
    // 3. Parents can message: Admins, and teachers assigned to their wards
    if (role === 'parent') {
        const parentProfile = await Parent.findOne({ schoolId, userId: currentUser._id });
        const contactUserIds = new Set();
        // Add admins
        const admins = await User.find({
            schoolId,
            role: { $in: ['admin', 'super_admin'] },
            status: 'active',
        })
            .select('_id name email role')
            .lean();
        admins.forEach((a) => contactUserIds.add(a._id.toString()));
        if (parentProfile && parentProfile.children && parentProfile.children.length > 0) {
            const wardProfileIds = parentProfile.children.map((c) => c.studentProfileId);
            const enrollments = await Enrollment.find({
                schoolId,
                studentId: { $in: wardProfileIds },
                status: 'enrolled',
            }).select('classId');
            const classIds = enrollments.map((e) => e.classId);
            if (classIds.length > 0) {
                const assignments = await SubjectAssignment.find({
                    schoolId,
                    classId: { $in: classIds },
                    status: 'active',
                }).select('teacherId');
                const teacherIds = assignments.map((a) => a.teacherId);
                const teachers = await Teacher.find({
                    schoolId,
                    _id: { $in: teacherIds },
                }).select('userId');
                teachers.forEach((t) => t.userId && contactUserIds.add(t.userId.toString()));
            }
        }
        const contacts = await User.find({
            schoolId,
            _id: { $in: Array.from(contactUserIds).map((id) => new Types.ObjectId(id)) },
            status: 'active',
        })
            .select('_id name email role')
            .lean();
        return contacts.map((c) => ({
            _id: c._id,
            name: c.name,
            email: c.email,
            role: c.role,
        }));
    }
    // 4. Students can message: Admins and teachers assigned to their class
    if (role === 'student') {
        const studentProfile = await Student.findOne({ schoolId, userId: currentUser._id });
        const contactUserIds = new Set();
        // Add admins
        const admins = await User.find({
            schoolId,
            role: { $in: ['admin', 'super_admin'] },
            status: 'active',
        })
            .select('_id name email role')
            .lean();
        admins.forEach((a) => contactUserIds.add(a._id.toString()));
        if (studentProfile) {
            const enrollment = await Enrollment.findOne({
                schoolId,
                studentId: studentProfile._id,
                status: 'enrolled',
            }).select('classId');
            if (enrollment) {
                const assignments = await SubjectAssignment.find({
                    schoolId,
                    classId: enrollment.classId,
                    status: 'active',
                }).select('teacherId');
                const teacherIds = assignments.map((a) => a.teacherId);
                const teachers = await Teacher.find({
                    schoolId,
                    _id: { $in: teacherIds },
                }).select('userId');
                teachers.forEach((t) => t.userId && contactUserIds.add(t.userId.toString()));
            }
        }
        const contacts = await User.find({
            schoolId,
            _id: { $in: Array.from(contactUserIds).map((id) => new Types.ObjectId(id)) },
            status: 'active',
        })
            .select('_id name email role')
            .lean();
        return contacts.map((c) => ({
            _id: c._id,
            name: c.name,
            email: c.email,
            role: c.role,
        }));
    }
    return [];
};
