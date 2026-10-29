import { calculateGradeForPercentage, roundPercentage, DEFAULT_GRADE_BANDS } from './grading.util.js';
/**
 * Calculates a single student's overall exam result
 */
export const calculateStudentExamResult = (studentId, examSubjects, marks, gradeBands = DEFAULT_GRADE_BANDS, studentInfo) => {
    // Map marks by examSubjectId
    const markMap = new Map();
    for (const m of marks) {
        if (m.studentId.toString() === studentId.toString()) {
            markMap.set(m.examSubjectId.toString(), m);
        }
    }
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let hasMissing = false;
    let hasExemptions = false;
    let allAbsent = examSubjects.length > 0;
    let anyFailed = false;
    const subjectResults = examSubjects.map((es) => {
        const markRecord = markMap.get(es._id.toString());
        const maxMarks = es.maxMarks;
        const passMarks = es.passMarks;
        // Case 1: Student is marked exempt
        if (markRecord?.isExempt) {
            hasExemptions = true;
            allAbsent = false;
            return {
                examSubjectId: es._id.toString(),
                subjectId: es.subjectId.toString(),
                maxMarks,
                passMarks,
                marksObtained: undefined,
                percentage: undefined,
                grade: 'EX',
                isPassed: true,
                isAbsent: false,
                isExempt: true,
                isMissing: false,
                status: 'EXEMPT',
                remarks: markRecord.remarks,
            };
        }
        // Case 2: Student is marked absent
        if (markRecord?.isAbsent) {
            totalMaxMarks += maxMarks;
            // absent counts as 0 marks
            totalMarksObtained += 0;
            anyFailed = true; // Subject is failed due to absence
            return {
                examSubjectId: es._id.toString(),
                subjectId: es.subjectId.toString(),
                maxMarks,
                passMarks,
                marksObtained: 0,
                percentage: 0,
                grade: 'AB',
                isPassed: false,
                isAbsent: true,
                isExempt: false,
                isMissing: false,
                status: 'ABSENT',
                remarks: markRecord.remarks,
            };
        }
        // Case 3: Missing marks (no record, or marksObtained is undefined/null)
        if (!markRecord || markRecord.marksObtained === undefined || markRecord.marksObtained === null) {
            hasMissing = true;
            allAbsent = false;
            totalMaxMarks += maxMarks;
            return {
                examSubjectId: es._id.toString(),
                subjectId: es.subjectId.toString(),
                maxMarks,
                passMarks,
                marksObtained: undefined,
                percentage: undefined,
                grade: undefined,
                isPassed: false,
                isAbsent: false,
                isExempt: false,
                isMissing: true,
                status: 'MISSING',
                remarks: markRecord?.remarks,
            };
        }
        // Case 4: Normal scored subject
        allAbsent = false;
        const obtained = markRecord.marksObtained;
        totalMarksObtained += obtained;
        totalMaxMarks += maxMarks;
        const rawPercentage = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
        const percentage = roundPercentage(rawPercentage);
        const gradeInfo = calculateGradeForPercentage(percentage, gradeBands);
        const isPassed = obtained >= passMarks && gradeInfo.isPassing;
        if (!isPassed) {
            anyFailed = true;
        }
        return {
            examSubjectId: es._id.toString(),
            subjectId: es.subjectId.toString(),
            maxMarks,
            passMarks,
            marksObtained: obtained,
            percentage,
            grade: gradeInfo.grade,
            gradePoint: gradeInfo.gradePoint,
            isPassed,
            isAbsent: false,
            isExempt: false,
            isMissing: false,
            status: 'SCORED',
            remarks: markRecord.remarks,
        };
    });
    const overallPercentage = totalMaxMarks > 0 ? roundPercentage((totalMarksObtained / totalMaxMarks) * 100) : 0;
    const overallGradeInfo = calculateGradeForPercentage(overallPercentage, gradeBands);
    let overallResult = 'PASS';
    if (hasMissing) {
        overallResult = 'INCOMPLETE';
    }
    else if (examSubjects.length > 0 && allAbsent) {
        overallResult = 'ABSENT';
    }
    else if (anyFailed || !overallGradeInfo.isPassing) {
        overallResult = 'FAIL';
    }
    else {
        overallResult = 'PASS';
    }
    const firstSub = examSubjects[0];
    return {
        studentId: studentId.toString(),
        studentName: studentInfo?.name,
        admissionNumber: studentInfo?.admissionNumber,
        rollNumber: studentInfo?.rollNumber,
        classId: studentInfo?.classId || firstSub?.classId?.toString(),
        sectionId: studentInfo?.sectionId || firstSub?.sectionId?.toString(),
        examId: firstSub?.examId?.toString() || '',
        academicSessionId: firstSub?.academicSessionId?.toString() || '',
        subjectResults,
        totalMarksObtained,
        totalMaxMarks,
        overallPercentage,
        overallGrade: overallGradeInfo.grade,
        overallGradePoint: overallGradeInfo.gradePoint,
        overallResult,
        isComplete: !hasMissing,
        hasExemptions,
    };
};
/**
 * Calculates aggregate class performance analytics across all students
 */
export const calculateClassAnalytics = (examId, examSubjects, studentResults) => {
    const totalEligible = studentResults.length;
    let completeCount = 0;
    let incompleteCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    let absentCount = 0;
    let totalPercentageSum = 0;
    let highestPercentage = 0;
    let lowestPercentage = totalEligible > 0 ? 100 : 0;
    const gradeDistribution = {};
    for (const sr of studentResults) {
        if (!sr.isComplete) {
            incompleteCount++;
        }
        else {
            completeCount++;
            totalPercentageSum += sr.overallPercentage;
            if (sr.overallPercentage > highestPercentage)
                highestPercentage = sr.overallPercentage;
            if (sr.overallPercentage < lowestPercentage)
                lowestPercentage = sr.overallPercentage;
            // Grade distribution
            const g = sr.overallGrade || 'F';
            gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
        }
        if (sr.overallResult === 'PASS')
            passedCount++;
        else if (sr.overallResult === 'FAIL')
            failedCount++;
        else if (sr.overallResult === 'ABSENT')
            absentCount++;
    }
    const classAveragePercentage = completeCount > 0 ? roundPercentage(totalPercentageSum / completeCount) : 0;
    const passPercentage = completeCount > 0 ? roundPercentage((passedCount / completeCount) * 100) : 0;
    // Subject-wise performance metrics
    const subjectAverages = examSubjects.map((es) => {
        let subMarksSum = 0;
        let scoredCount = 0;
        let highest = 0;
        let lowest = es.maxMarks;
        let subPass = 0;
        let subFail = 0;
        for (const sr of studentResults) {
            const matchSub = sr.subjectResults.find((sub) => sub.examSubjectId === es._id.toString());
            if (matchSub && matchSub.status === 'SCORED' && matchSub.marksObtained !== undefined) {
                scoredCount++;
                subMarksSum += matchSub.marksObtained;
                if (matchSub.marksObtained > highest)
                    highest = matchSub.marksObtained;
                if (matchSub.marksObtained < lowest)
                    lowest = matchSub.marksObtained;
                if (matchSub.isPassed)
                    subPass++;
                else
                    subFail++;
            }
            else if (matchSub && matchSub.status === 'ABSENT') {
                subFail++;
            }
        }
        const averageMarks = scoredCount > 0 ? roundPercentage(subMarksSum / scoredCount) : 0;
        const averagePercentage = es.maxMarks > 0 ? roundPercentage((averageMarks / es.maxMarks) * 100) : 0;
        return {
            subjectId: es.subjectId.toString(),
            maxMarks: es.maxMarks,
            averageMarks,
            averagePercentage,
            highestMarks: scoredCount > 0 ? highest : 0,
            lowestMarks: scoredCount > 0 ? lowest : 0,
            passCount: subPass,
            failCount: subFail,
        };
    });
    return {
        examId,
        totalEligible,
        completeResultsCount: completeCount,
        incompleteResultsCount: incompleteCount,
        passedCount,
        failedCount,
        absentCount,
        classAveragePercentage,
        passPercentage,
        highestPercentage: completeCount > 0 ? highestPercentage : 0,
        lowestPercentage: completeCount > 0 ? lowestPercentage : 0,
        gradeDistribution,
        subjectAverages,
    };
};
