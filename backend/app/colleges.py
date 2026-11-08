"""College names shared by account, referral and reporting flows."""
import re

COLLEGES = (
    'College of Business', 'College of Arts and Sciences', 'College of Nursing',
    'College of Medicine', 'College of Technologies', 'College of Education',
)


def _name_key(value):
    return ' '.join(re.sub(r'[^\w\s]', ' ', str(value or '').replace('&', ' and ')).lower().split())


_CANONICAL = {_name_key(name): name for name in COLLEGES}
_CANONICAL['college of technology'] = 'College of Technologies'


def normalize_college(value) -> str:
    name = str(value or '').strip()
    return _CANONICAL.get(_name_key(name), name)


def college_match(value) -> dict:
    name = normalize_college(value)
    alternatives = [key for key, canonical in _CANONICAL.items() if canonical == name]
    if not alternatives:
        alternatives = [_name_key(name)]
    patterns = []
    for alias in alternatives:
        patterns.append(r'[\s.,_-]+'.join(r'(?:and|&)' if token == 'and' else re.escape(token)
                                        for token in alias.split()))
    pattern = '(?:' + '|'.join(patterns) + ')'
    return {'$regex': rf'^\s*{pattern}\s*$', '$options': 'i'}


def college_for(doc) -> str:
    return normalize_college((doc or {}).get('college') or (doc or {}).get('department'))
