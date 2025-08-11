from __future__ import annotations
from typing import Optional, List, Any, Dict, TypeVar, Generic, Union
from pydantic import BaseModel, Field
from enum import Enum

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """分页数据"""

    total: int
    limit: int
    offset: int
    data: List[T]


class SubjectType(Enum):
    """条目类型
    - `1` 为 书籍
    - `2` 为 动画
    - `3` 为 音乐
    - `4` 为 游戏
    - `6` 为 三次元
    """

    BOOK = 1
    ANIME = 2
    MUSIC = 3
    GAME = 4
    REAL = 6


class Images(BaseModel):
    """图片信息"""

    large: str
    common: str
    medium: str
    small: str
    grid: str


class RatingCount(BaseModel):
    """评分分布"""

    one: int = Field(..., alias="1")
    two: int = Field(..., alias="2")
    three: int = Field(..., alias="3")
    four: int = Field(..., alias="4")
    five: int = Field(..., alias="5")
    six: int = Field(..., alias="6")
    seven: int = Field(..., alias="7")
    eight: int = Field(..., alias="8")
    nine: int = Field(..., alias="9")
    ten: int = Field(..., alias="10")


class Rating(BaseModel):
    """评分"""

    rank: int
    total: int
    count: RatingCount
    score: float


class Collection(BaseModel):
    """收藏统计"""

    wish: int
    collect: int
    doing: int
    on_hold: int
    dropped: int


class Tag(BaseModel):
    """标签"""

    name: str
    count: int


class WikiInfoValueItem(BaseModel):
    """Infobox 值项目"""

    v: str
    k: Optional[str] = None


class WikiInfo(BaseModel):
    """Infobox 项目"""

    key: str
    value: Union[str, List[WikiInfoValueItem]]


class Subject(BaseModel):
    """条目信息"""

    id: int
    type: SubjectType
    name: str
    name_cn: str
    summary: str
    nsfw: bool
    locked: bool
    date: Optional[str] = None
    platform: Optional[str] = None
    images: Images
    infobox: Optional[List[WikiInfo]] = None
    volumes: Optional[int] = None
    eps: Optional[int] = None
    total_episodes: Optional[int] = None
    rating: Optional[Rating] = None
    collection: Optional[Collection] = None
    tags: Optional[List[Tag]] = None
    meta_tags: Optional[List[str]] = None
    series: bool


class PagedSubject(Page[Subject]):
    """分页条目数据"""

    pass


class PersonImages(BaseModel):
    """人物图片"""

    large: str
    medium: str
    small: str
    grid: str


class PersonType(Enum):
    """人物类型"""

    INDIVIDUAL = 1
    CORPORATION = 2
    ASSOCIATION = 3


class PersonCareer(str, Enum):
    """职业"""

    PRODUCER = "producer"
    MANGAKA = "mangaka"
    ARTIST = "artist"
    SEIYU = "seiyu"
    WRITER = "writer"
    ILLUSTRATOR = "illustrator"
    ACTOR = "actor"


class RelatedPerson(BaseModel):
    """关联人物"""

    id: int
    name: str
    type: PersonType
    career: List[PersonCareer]
    images: Optional[PersonImages] = None
    relation: str
    eps: str


class CharacterType(Enum):
    """角色类型"""

    CHARACTER = 1
    MECHANIC = 2
    SHIP = 3
    ORGANIZATION = 4


class Person(BaseModel):
    """人物基本信息"""

    id: int
    name: str
    type: PersonType
    career: List[PersonCareer]
    images: Optional[PersonImages] = None
    short_summary: str
    locked: bool


class RelatedCharacter(BaseModel):
    """关联角色"""

    id: int
    name: str
    type: CharacterType
    images: Optional[PersonImages] = None
    relation: str
    actors: Optional[List[Person]] = None


class SubjectRelation(BaseModel):
    """关联条目"""

    id: int
    type: int
    name: str
    name_cn: str
    images: Optional[Images] = None
    relation: str


class SearchSubjectsFilter(BaseModel):
    """条目搜索过滤器"""

    type: Optional[List[SubjectType]] = None
    meta_tags: Optional[List[str]] = Field(
        None, description="公共标签。可以用 `-` 排除标签。"
    )
    tag: Optional[List[str]] = None
    air_date: Optional[List[str]] = None
    rating: Optional[List[str]] = None
    rank: Optional[List[str]] = None
    nsfw: Optional[bool] = None


class SearchSubjectsRequest(BaseModel):
    """条目搜索请求体"""

    keyword: str
    sort: Optional[str] = "match"
    filter: Optional[SearchSubjectsFilter] = None


class CharacterFilter(BaseModel):
    nsfw: Optional[bool] = None


class SearchCharactersRequest(BaseModel):
    keyword: str
    filter: Optional[CharacterFilter] = None


class Stat(BaseModel):
    comments: int
    collects: int


class BloodType(Enum):
    A = 1
    B = 2
    AB = 3
    O = 4


class Character(BaseModel):
    id: int
    name: str
    type: CharacterType
    images: Optional[PersonImages] = None
    summary: str
    locked: bool
    infobox: Optional[List[Dict[str, Any]]] = None
    gender: Optional[str] = None
    blood_type: Optional[BloodType] = Field(None, alias="blood_type")
    birth_year: Optional[int] = Field(None, alias="birth_year")
    birth_mon: Optional[int] = Field(None, alias="birth_mon")
    birth_day: Optional[int] = Field(None, alias="birth_day")
    stat: Stat


class PagedCharacter(BaseModel):
    total: Optional[int] = 0
    limit: Optional[int] = 0
    offset: Optional[int] = 0
    data: Optional[List[Character]] = []


class V0RelatedSubject(BaseModel):
    id: int
    type: SubjectType
    staff: str
    name: str
    name_cn: str = Field(..., alias="name_cn")
    image: Optional[str] = None


class ImageType(str, Enum):
    """图片类型"""

    SMALL = "small"
    GRID = "grid"
    LARGE = "large"
    MEDIUM = "medium"
    COMMON = "common"


class CharacterPerson(BaseModel):
    id: int
    name: str
    type: CharacterType
    images: Optional[PersonImages] = None
    subject_id: int = Field(..., alias="subject_id")
    subject_type: SubjectType = Field(..., alias="subject_type")
    subject_name: str = Field(..., alias="subject_name")
    subject_name_cn: str = Field(..., alias="subject_name_cn")
    staff: Optional[str] = None
