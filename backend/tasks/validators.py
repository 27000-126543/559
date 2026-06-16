from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator, ValidationError
from datetime import datetime


class ParameterRange(BaseModel):
    min: Optional[Union[int, float]] = None
    max: Optional[Union[int, float]] = None
    step: Optional[Union[int, float]] = None


class ParameterField(BaseModel):
    name: str
    type: str = Field(..., pattern='^(int|float|string|bool|array|object)$')
    required: bool = False
    default: Optional[Any] = None
    description: Optional[str] = None
    range: Optional[ParameterRange] = None
    options: Optional[List[Any]] = None
    pattern: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None


class ParameterSchemaValidator(BaseModel):
    parameters: List[ParameterField]

    @field_validator('parameters')
    @classmethod
    def validate_parameter_names(cls, v):
        names = [p.name for p in v]
        if len(names) != len(set(names)):
            raise ValueError('参数名称不能重复')
        return v


class TaskParameterValidator:
    def __init__(self, schema: Dict[str, Any]):
        try:
            self.schema_validator = ParameterSchemaValidator(**schema)
            self.fields = {p.name: p for p in self.schema_validator.parameters}
        except ValidationError as e:
            raise ValueError(f'参数模板格式错误: {e}')

    def validate(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        errors = []
        validated = {}

        for field_name, field in self.fields.items():
            value = parameters.get(field_name, field.default)

            if field.required and value is None:
                errors.append(f'参数 {field_name} 是必填项')
                continue

            if value is None:
                continue

            try:
                validated_value = self._validate_field(field, value, field_name)
                validated[field_name] = validated_value
            except ValueError as e:
                errors.append(str(e))

        extra_fields = set(parameters.keys()) - set(self.fields.keys())
        if extra_fields:
            errors.append(f'未知参数: {", ".join(extra_fields)}')

        if errors:
            raise ValueError('; '.join(errors))

        return validated

    def _validate_field(self, field: ParameterField, value: Any, field_name: str) -> Any:
        type_map = {
            'int': int,
            'float': (int, float),
            'string': str,
            'bool': bool,
            'array': list,
            'object': dict,
        }

        expected_type = type_map[field.type]
        if not isinstance(value, expected_type):
            raise ValueError(
                f'参数 {field_name} 类型错误，期望 {field.type}，实际 {type(value).__name__}'
            )

        if field.type in ['int', 'float']:
            if field.range:
                if field.range.min is not None and value < field.range.min:
                    raise ValueError(f'参数 {field_name} 不能小于 {field.range.min}')
                if field.range.max is not None and value > field.range.max:
                    raise ValueError(f'参数 {field_name} 不能大于 {field.range.max}')
                if field.range.step is not None:
                    if field.type == 'int':
                        if (value - field.range.min) % field.range.step != 0:
                            raise ValueError(
                                f'参数 {field_name} 必须是 {field.range.min} + n * {field.range.step}'
                            )

        if field.type == 'string':
            if field.min_length is not None and len(value) < field.min_length:
                raise ValueError(f'参数 {field_name} 长度不能小于 {field.min_length}')
            if field.max_length is not None and len(value) > field.max_length:
                raise ValueError(f'参数 {field_name} 长度不能大于 {field.max_length}')
            if field.pattern:
                import re
                if not re.match(field.pattern, value):
                    raise ValueError(f'参数 {field_name} 格式不匹配')

        if field.options is not None and value not in field.options:
            raise ValueError(f'参数 {field_name} 必须是以下值之一: {field.options}')

        return value


def validate_task_parameters(schema: Dict[str, Any], parameters: Dict[str, Any]) -> Dict[str, Any]:
    validator = TaskParameterValidator(schema)
    return validator.validate(parameters)
