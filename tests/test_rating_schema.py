import pytest
from pydantic import ValidationError
from src.books.schema import RatingCreate


def test_score_6_rejected():
    with pytest.raises(ValidationError):
        RatingCreate(score=6.0)


def test_score_0_rejected():
    with pytest.raises(ValidationError):
        RatingCreate(score=0.0)


def test_score_5_accepted():
    r = RatingCreate(score=5.0)
    assert r.score == 5.0


def test_score_1_accepted():
    r = RatingCreate(score=1.0)
    assert r.score == 1.0


def test_score_float_accepted():
    r = RatingCreate(score=4.7)
    assert r.score == 4.7


def test_score_none_accepted():
    r = RatingCreate(score=None)
    assert r.score is None
