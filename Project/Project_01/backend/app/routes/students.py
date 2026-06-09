"""
DB Demo Studio — 学生进度 REST API
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.student_progress import StudentProgress

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/students", tags=["students"])


class ProgressResponse(BaseModel):
    student_id: str
    subject: str
    total_questions: int
    correct_answers: int
    accuracy: float
    mastery: dict
    quiz_answers: list


@router.get("/{student_id}/progress")
async def get_student_progress(
    student_id: str,
    teacher_id: str = "default",
    subject: str = "",
    db: AsyncSession = Depends(get_db),
):
    """获取学生学习进度和掌握度"""
    query = select(StudentProgress).where(
        StudentProgress.student_id == student_id,
        StudentProgress.teacher_id == teacher_id,
    )
    if subject:
        query = query.where(StudentProgress.subject == subject)
    result = await db.execute(query.order_by(StudentProgress.updated_at.desc()))
    records = result.scalars().all()

    # 聚合所有记录
    total_q = sum(r.total_questions for r in records)
    total_correct = sum(r.correct_answers for r in records)
    mastery = {}
    for r in records:
        if r.mastery:
            for k, v in r.mastery.items():
                mastery[k] = max(mastery.get(k, 0), v)
    all_answers = []
    for r in records:
        if r.quiz_answers:
            all_answers.extend(r.quiz_answers)

    return {
        "student_id": student_id,
        "total_questions": total_q,
        "correct_answers": total_correct,
        "accuracy": round(total_correct / total_q, 2) if total_q > 0 else 0,
        "mastery": mastery,
        "quiz_answers": all_answers[-50:],  # 最近 50 条
    }


class ProgressReportResponse(BaseModel):
    students: list[ProgressResponse]
    weak_nodes: list[str]
    recommendations: list[str]


@router.get("/report")
async def get_class_report(
    teacher_id: str = "default",
    subject: str = "",
    weakness_threshold: float = 0.6,
    db: AsyncSession = Depends(get_db),
):
    """获取全班学习报告（含薄弱点分析）"""
    query = select(StudentProgress).where(
        StudentProgress.teacher_id == teacher_id,
    )
    if subject:
        query = query.where(StudentProgress.subject == subject)
    result = await db.execute(query)
    records = result.scalars().all()

    # 按 student_id 聚合
    students_map: dict[str, dict] = {}
    for r in records:
        if r.student_id not in students_map:
            students_map[r.student_id] = {
                "student_id": r.student_id,
                "total_questions": 0,
                "correct_answers": 0,
                "mastery_sum": {},
                "mastery_count": {},
                "quiz_answers": [],
            }
        s = students_map[r.student_id]
        s["total_questions"] += r.total_questions
        s["correct_answers"] += r.correct_answers
        if r.mastery:
            for k, v in r.mastery.items():
                s["mastery_sum"][k] = s["mastery_sum"].get(k, 0) + v
                s["mastery_count"][k] = s["mastery_count"].get(k, 0) + 1
        if r.quiz_answers:
            s["quiz_answers"].extend(r.quiz_answers)

    # 计算平均值
    for s in students_map.values():
        mastery = {}
        for k in s["mastery_sum"]:
            cnt = s["mastery_count"].get(k, 1)
            mastery[k] = round(s["mastery_sum"][k] / cnt, 2)
        s["mastery"] = mastery

    # 找出薄弱点（掌握度 < weakness_threshold）
    weak_nodes_map: dict[str, int] = {}
    for s in students_map.values():
        for node, score in s["mastery"].items():
            if score < weakness_threshold:
                weak_nodes_map[node] = weak_nodes_map.get(node, 0) + 1
                weak_nodes_map[node] = weak_nodes_map.get(node, 0) + 1
    weak_nodes = sorted(weak_nodes_map, key=weak_nodes_map.get, reverse=True)

    # 生成推荐（简单规则）
    recommendations = []
    for node in weak_nodes[:3]:
        recommendations.append(f"建议复习知识点「{node}」，全班掌握度偏低")
    if not recommendations:
        recommendations.append("全班掌握度良好，建议进入下一章节")

    return {
        "students": [
            {
                "student_id": s["student_id"],
                "total_questions": s["total_questions"],
                "correct_answers": s["correct_answers"],
                "accuracy": round(s["correct_answers"] / s["total_questions"], 2)
                if s["total_questions"] > 0 else 0,
                "mastery": s["mastery"],
            }
            for s in students_map.values()
        ],
        "weak_nodes": weak_nodes,
        "recommendations": recommendations,
    }
