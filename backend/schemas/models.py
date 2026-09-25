from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

Priority = Literal["Critical", "High", "Medium", "Low"]
DueStage = Literal["Day 1", "Week 1", "Week 2", "First 30 Days", "First 60 Days", "First 90 Days"]
ReqType = Literal[
    "Must Know", "Must Complete", "Must Demonstrate", "Must Acknowledge",
    "Recommended", "Optional", "Not Applicable",
]
UserRole = Literal["admin", "manager", "reviewer", "learner", "training_manager"]
Difficulty = Literal["Beginner", "Intermediate", "Advanced"]


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str = ""
    role: UserRole = "learner"
    employee_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class RoleCreate(BaseModel):
    title: str
    department: str = ""
    description: str = ""


class EmployeeCreate(BaseModel):
    name: str = ""
    full_name: str = ""
    email: str = ""
    role: str = ""
    job_role: str = ""
    department: str = ""
    experience_level: str = "Beginner"
    location: str = ""
    joining_date: Optional[str] = None
    manager: str = ""
    reporting_manager: str = ""


class RequirementCreate(BaseModel):
    role: str = ""
    role_title: str = ""
    requirement: str = ""
    title: str = ""
    description: str = ""
    competency: str = ""
    category: str = ""
    mandatory: bool = False
    priority: Priority = "Medium"
    due_stage: DueStage = "Week 1"
    assessment_topic: str = ""
    source_document_id: Optional[str] = None
    source_document_version: Optional[str] = None
    source_section_id: Optional[str] = None
    source_chunk_id: Optional[str] = None
    approval_status: str = "Approved"
    prerequisites: list[str] = []


class GeneratePlanRequest(BaseModel):
    employee_id: Optional[str] = None
    employee_name: str
    role_title: str
    role: str = ""
    department: str = ""
    experience_level: str = "Beginner"
    target_completion: str = "30 Days"
    joining_date: Optional[str] = None


class ReviewDecision(BaseModel):
    plan_id: str | int
    decision: Literal["Approved", "Rejected", "Edited"]
    comment: str = ""
    override_result: str = ""


class ToggleTaskRequest(BaseModel):
    plan_id: str | int
    task_id: str
    completed: bool


# ---- GenAI structured output (SRS Step 37/38) ----
class QuizQuestion(BaseModel):
    question: str
    question_type: Literal["multiple_choice", "multiple_response", "true_false", "scenario"] = "multiple_choice"
    options: list[str]
    correct_answer: list[int | bool]
    explanation: str = ""
    difficulty: Difficulty = "Beginner"
    source_document_id: str = ""
    source_section_id: str = ""
    requirement_id: str = ""


class GenTask(BaseModel):
    title: str
    description: str = ""
    task_type: str = "Reading"
    difficulty: Difficulty = "Beginner"
    due_stage: DueStage = "Week 1"
    estimated_minutes: int = 30
    mandatory: bool = False
    expected_outcome: str = ""
    completion_criteria: str = ""
    source_document_id: str = ""
    source_section_id: str = ""
    requirement_id: str = ""
    scenario: bool = False
    completed: bool = False


class GenChecklistItem(BaseModel):
    activity: str
    mandatory: bool = False
    due_stage: DueStage = "Week 1"
    source_document_id: str = ""
    responsible_person: str = ""


class GenAssessment(BaseModel):
    title: str
    assessment_type: str = "Knowledge"
    topic: str = ""
    difficulty: Difficulty = "Beginner"
    due_stage: DueStage = "First 30 Days"
    rubric: list[dict[str, Any]] = []
    source_document_id: str = ""
    source_section_id: str = ""


class GenModule(BaseModel):
    module_id: str
    module_title: str
    purpose: str = ""
    description: str = ""
    role: str = ""
    department: str = ""
    mandatory: bool = False
    due_stage: DueStage = "Week 1"
    priority: Priority = "Medium"
    estimated_hours: float = 1
    difficulty: Difficulty = "Beginner"
    learning_objectives: list[str] = []
    key_concepts: list[str] = []
    source_document_id: str = ""
    source_section_id: str = ""
    source_citations: list[str] = []
    prerequisites: list[str] = []
    assessment_topic: str = ""
    completion_criteria: str = ""
    requirement_id: str = ""
    requirement_ids: list[str] = []
    tasks: list[GenTask | str] = []
    quiz: list[QuizQuestion] = []
    checklist: list[GenChecklistItem] = []
    assessments: list[GenAssessment] = []
    progress: Optional[dict[str, Any]] = None


class GenOnboardingPlan(BaseModel):
    role: str
    department: str = ""
    employee_name: str = ""
    target_completion: str = "30 Days"
    stages: list[str] = []
    modules: list[GenModule] = []
    progress_recommendations: list[str] = []
    explanations: list[str] = []
