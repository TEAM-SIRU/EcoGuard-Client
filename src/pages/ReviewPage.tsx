import { useState } from 'react'
import type { ReviewItem } from '../types'
import { publicFileUrl } from '../api'
import { Card } from '../components/Card'
import { Empty } from '../components/Empty'
import { formatTime } from '../lib/date'

export function Review({
  items,
  selectedId,
  onSelect,
  onDecide,
}: {
  items: ReviewItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  onDecide: (item: ReviewItem, decision: 'APPROVED' | 'REJECTED', reason?: string) => void
}) {
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const item = items.find((review) => review.verificationId === selectedId) ?? items[0]
  return (
    <div className="review-grid">
      <Card className="review-queue">
        <div className="queue-heading">
          <b>확인 대기</b>
          <span>{items.length}건</span>
        </div>
        {items.map((review) => (
          <button
            key={review.verificationId}
            className={`review-item ${item?.verificationId === review.verificationId ? 'active' : ''}`}
            onClick={() => onSelect(review.verificationId)}
          >
            <b>
              {review.studentName} · {review.areaName}
            </b>
            <span>
              {review.areaName} · 제출 {formatTime(review.submittedAt)}
            </span>
            <small>
              {review.reason || review.failReasons.join(' · ') || 'AI 판단을 확인해 주세요.'}
            </small>
          </button>
        ))}
      </Card>
      {item ? (
        <Card className="review-detail">
          <div className="review-detail-grid">
            <div className="review-photo-column">
              {item.photoUrl ? (
                <img
                  className="evidence-picture"
                  src={publicFileUrl(item.photoUrl)}
                  alt={`${item.studentName} 인증 사진`}
                />
              ) : (
                <div className="evidence-picture">[학생 제출 사진]</div>
              )}
              <small>촬영 {formatTime(item.submittedAt)} · 앱 카메라로 촬영됨</small>
            </div>
            <div className="review-info-column">
              <div className="review-who">
                <b>
                  {item.studentName} · {item.areaName}
                </b>
                <small>
                  {item.areaName} · 제출 {formatTime(item.submittedAt)}
                </small>
              </div>
              <div className="review-info-box">
                <small>AI 판단</small>
                <b>
                  {item.reason ||
                    item.failReasons.join(' · ') ||
                    'AI가 자동으로 처리하지 못해 교사 확인이 필요해요.'}
                </b>
              </div>
              <div className="zone-description review-zone-description">
                <b>구역 설명</b>
                <p>{item.areaName} 청소 인증 사진을 확인해 주세요.</p>
              </div>
              <label className="review-rejection-reason">
                반려 사유 <small>입력하면 학생에게 전달돼요. 최대 200자.</small>
                <textarea
                  value={reasons[item.verificationId] ?? ''}
                  maxLength={200}
                  rows={3}
                  onChange={(event) =>
                    setReasons((current) => ({
                      ...current,
                      [item.verificationId]: event.target.value,
                    }))
                  }
                  placeholder="학생에게 안내할 반려 사유를 입력해 주세요"
                />
              </label>
              <div className="decision-actions">
                <button className="button primary" onClick={() => onDecide(item, 'APPROVED')}>
                  승인 · 10분 적립
                </button>
                <button
                  className="button secondary"
                  onClick={() => onDecide(item, 'REJECTED', reasons[item.verificationId])}
                >
                  반려
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <Empty title="검수 대기 인증이 없어요" detail="새로운 인증이 제출되면 여기에 표시돼요." />
        </Card>
      )}
    </div>
  )
}
