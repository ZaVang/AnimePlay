import requests
from typing import Optional, List, Union
from .config import get_default_headers
from .models import (
    Subject, 
    PagedSubject, 
    RelatedPerson, 
    RelatedCharacter, 
    SubjectRelation,
    SearchSubjectsRequest, 
    SubjectType, 
    ImageType, 
    SearchCharactersRequest, 
    PagedCharacter,
    Character, 
    V0RelatedSubject, 
    CharacterPerson
)


def get_subject_by_id(subject_id: int, access_token: Optional[str] = None) -> Subject:
    """
    使用 requests 库根据条目 ID 从 Bangumi API 获取单个条目的详细信息。

    Args:
        subject_id (int): 您想要获取的条目的 ID。例如：302282。
        access_token (Optional[str]): 您的 Bangumi API 访问令牌 (Access Token)。
                                      虽然此接口是公开的，但提供令牌可以查看私有或NSFW内容。
                                      默认为 None。

    Returns:
        Subject: 一个包含条目详细信息的 Pydantic 模型对象。
                 对象的结构遵循 Bangumi API 的 Subject 模型。

    Raises:
        requests.exceptions.HTTPError: 如果 API 返回一个不成功的 HTTP 状态码（例如，404 Not Found
                                     或 400 Bad Request），则会引发此异常。
        requests.exceptions.RequestException: 如果发生网络问题（例如，DNS 错误、连接超时），
                                            则会引发此异常。
        pydantic.ValidationError: 如果 API 返回的数据不符合 Subject 模型的结构，则会引发此异常。

    Example:
        >>> try:
        ...     subject_data = get_subject_by_id_requests(302282)
        ...     print(f"条目名称: {subject_data.name_cn}")
        ...     print(f"平台: {subject_data.platform}")
        ...     print(f"简介: {subject_data.summary[:50]}...")
        ... except requests.exceptions.HTTPError as e:
        ...     print(f"发生错误: {e}")
    """
    api_url = f"https://api.bgm.tv/v0/subjects/{subject_id}"
    
    headers = get_default_headers()

    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, timeout=10, proxies=proxies)
    response.raise_for_status()

    return Subject.model_validate(response.json())


def search_subjects(
    request_body: SearchSubjectsRequest,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    access_token: Optional[str] = None
) -> PagedSubject:
    """
    条目搜索。

    Args:
        request_body (SearchSubjectsRequest): 搜索请求体。
        limit (Optional[int]): 分页参数。
        offset (Optional[int]): 分页参数。
        access_token (Optional[str]): 访问令牌。

    Returns:
        PagedSubject: 搜索结果。
    """
    api_url = "https://api.bgm.tv/v0/search/subjects"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    params = {}
    if limit is not None:
        params["limit"] = limit
    if offset is not None:
        params["offset"] = offset
    
    proxies = {"http": None, "https": None}

    response = requests.post(
        api_url,
        headers=headers,
        params=params,
        json=request_body.model_dump(mode="json", by_alias=True, exclude_none=True),
        timeout=30,
        proxies=proxies
    )
    response.raise_for_status()
    return PagedSubject.model_validate(response.json())


def get_subjects(
    subject_type: SubjectType,
    cat: Optional[Union[int, str]] = None,
    series: Optional[bool] = None,
    platform: Optional[str] = None,
    sort: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    access_token: Optional[str] = None
) -> PagedSubject:
    """
    浏览条目。

    Args:
        subject_type (SubjectType): 条目类型。
        cat (Optional[Union[int, str]]): 条目分类。
        series (Optional[bool]): 是否系列。
        platform (Optional[str]): 平台。
        sort (Optional[str]): 排序 (date|rank)。
        year (Optional[int]): 年份。
        month (Optional[int]): 月份。
        limit (Optional[int]): 分页参数。
        offset (Optional[int]): 分页参数。
        access_token (Optional[str]): 访问令牌。

    Returns:
        PagedSubject: 条目列表。
    """
    api_url = "https://api.bgm.tv/v0/subjects"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    params = {"type": subject_type.value}
    if cat is not None:
        params["cat"] = cat
    if series is not None:
        params["series"] = series
    if platform is not None:
        params["platform"] = platform
    if sort is not None:
        params["sort"] = sort
    if year is not None:
        params["year"] = year
    if month is not None:
        params["month"] = month
    if limit is not None:
        params["limit"] = limit
    if offset is not None:
        params["offset"] = offset

    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, params=params, timeout=10, proxies=proxies)
    response.raise_for_status()
    return PagedSubject.model_validate(response.json())


def get_subject_image(
    subject_id: int,
    image_type: ImageType,
    access_token: Optional[str] = None
) -> str:
    """
    获取条目封面。

    Args:
        subject_id (int): 条目 ID。
        image_type (ImageType): 图片类型。
        access_token (Optional[str]): 访问令牌。

    Returns:
        str: 图片的 URL。
    """
    api_url = f"https://api.bgm.tv/v0/subjects/{subject_id}/image"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    params = {"type": image_type.value}
    proxies = {"http": None, "https": None}

    response = requests.get(
        api_url,
        headers=headers,
        params=params,
        timeout=10,
        proxies=proxies,
        allow_redirects=False
    )
    response.raise_for_status()
    if response.status_code == 302:
        return response.headers.get("Location", "")
    return ""


def get_related_persons(subject_id: int, access_token: Optional[str] = None) -> List[RelatedPerson]:
    """
    获取条目关联人物。

    Args:
        subject_id (int): 条目 ID。
        access_token (Optional[str]): 访问令牌。

    Returns:
        List[RelatedPerson]: 关联人物列表。
    """
    api_url = f"https://api.bgm.tv/v0/subjects/{subject_id}/persons"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    
    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, timeout=10, proxies=proxies)
    response.raise_for_status()
    
    data = response.json()
    return [RelatedPerson.model_validate(item) for item in data]


def get_related_characters(subject_id: int, access_token: Optional[str] = None) -> List[RelatedCharacter]:
    """
    获取条目关联角色。

    Args:
        subject_id (int): 条目 ID。
        access_token (Optional[str]): 访问令牌。

    Returns:
        List[RelatedCharacter]: 关联角色列表。
    """
    api_url = f"https://api.bgm.tv/v0/subjects/{subject_id}/characters"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    
    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, timeout=10, proxies=proxies)
    response.raise_for_status()
    
    data = response.json()
    return [RelatedCharacter.model_validate(item) for item in data]


def get_related_subjects(subject_id: int, access_token: Optional[str] = None) -> List[SubjectRelation]:
    """
    获取条目关联条目。

    Args:
        subject_id (int): 条目 ID。
        access_token (Optional[str]): 访问令牌。

    Returns:
        List[SubjectRelation]: 关联条目列表。
    """
    api_url = f"https://api.bgm.tv/v0/subjects/{subject_id}/subjects"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    
    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, timeout=10, proxies=proxies)
    response.raise_for_status()
    
    data = response.json()
    return [SubjectRelation.model_validate(item) for item in data]


def search_characters(
    request_body: "SearchCharactersRequest",
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    access_token: Optional[str] = None,
) -> "PagedCharacter":
    """
    角色搜索。

    Args:
        request_body (SearchCharactersRequest): 搜索请求体。
        limit (Optional[int]): 分页参数。
        offset (Optional[int]): 分页参数。
        access_token (Optional[str]): 访问令牌。

    Returns:
        PagedCharacter: 搜索结果。
    """
    api_url = "https://api.bgm.tv/v0/search/characters"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    params = {}
    if limit is not None:
        params["limit"] = limit
    if offset is not None:
        params["offset"] = offset

    proxies = {"http": None, "https": None}

    response = requests.post(
        api_url,
        headers=headers,
        params=params,
        json=request_body.model_dump(mode="json", by_alias=True, exclude_none=True),
        timeout=30,
        proxies=proxies,
    )
    response.raise_for_status()
    return PagedCharacter.model_validate(response.json())


def get_character_by_id(
    character_id: int, access_token: Optional[str] = None
) -> "Character":
    """
    获取角色详情。

    Args:
        character_id (int): 角色 ID。
        access_token (Optional[str]): 访问令牌。

    Returns:
        Character: 角色详情。
    """
    api_url = f"https://api.bgm.tv/v0/characters/{character_id}"
    headers = get_default_headers()

    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, timeout=10, proxies=proxies)
    response.raise_for_status()

    return Character.model_validate(response.json())


def get_character_image(
    character_id: int, image_type: ImageType, access_token: Optional[str] = None
) -> str:
    """
    获取角色图片。

    Args:
        character_id (int): 角色 ID。
        image_type (ImageType): 图片类型。
        access_token (Optional[str]): 访问令牌。

    Returns:
        str: 图片的 URL。
    """
    api_url = f"https://api.bgm.tv/v0/characters/{character_id}/image"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    params = {"type": image_type.value}
    proxies = {"http": None, "https": None}

    response = requests.get(
        api_url,
        headers=headers,
        params=params,
        timeout=10,
        proxies=proxies,
        allow_redirects=False,
    )
    response.raise_for_status()
    if response.status_code == 302:
        return response.headers.get("Location", "")
    return ""


def get_character_related_subjects(
    character_id: int, access_token: Optional[str] = None
) -> List[V0RelatedSubject]:
    """
    获取角色关联条目。

    Args:
        character_id (int): 角色 ID。
        access_token (Optional[str]): 访问令牌。

    Returns:
        List[V0RelatedSubject]: 关联条目列表。
    """
    api_url = f"https://api.bgm.tv/v0/characters/{character_id}/subjects"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, timeout=10, proxies=proxies)
    response.raise_for_status()

    data = response.json()
    return [V0RelatedSubject.model_validate(item) for item in data]


def get_character_related_persons(
    character_id: int, access_token: Optional[str] = None
) -> List[CharacterPerson]:
    """
    获取角色关联人物。

    Args:
        character_id (int): 角色 ID。
        access_token (Optional[str]): 访问令牌。

    Returns:
        List[CharacterPerson]: 关联人物列表。
    """
    api_url = f"https://api.bgm.tv/v0/characters/{character_id}/persons"
    headers = get_default_headers()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    proxies = {"http": None, "https": None}

    response = requests.get(api_url, headers=headers, timeout=10, proxies=proxies)
    response.raise_for_status()

    data = response.json()
    return [CharacterPerson.model_validate(item) for item in data]
