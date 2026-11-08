import { useState } from 'react'
import type { Appeal } from '../types'
import { publicFileUrl } from '../api'
import { Card, CardTitle } from '../components/Card'
import { Empty } from '../components/Empty'
import { Status } from '../components/Status'
import { APPEAL_STATUS_LABELS } from '../constants/status'

export function Appeals({
  items,
  selectedId,
  onSelect,
  onDecide,
}: {
  items: Appeal[]
  selectedId: number | null
  onSelect: (id: number) => void
  onDecide: (item: Appeal, decision: 'APPROVED' | 'REJECTED', reply: string) => void
}) {
  const [replies, setReplies] = useState<Record<number, string>>({})
  const appeal = items.find((item) => item.appealId === selectedId) ?? items[0]
  const reply = appeal ? (replies[appeal.appealId] ?? '') : ''
  return (
    <div className="two-col appeal-layout">
      <Card>
        <CardTitle title="이의신청 목록" detail={`검토 대기 ${items.length}건`} />
        {items.map((item) => (
          <button
            key={item.appealId}
            className={`appeal-list ${appeal?.appealId === item.appealId ? 'active' : ''}`}
            onClick={() => onSelect(item.appealId)}
          >
            <span className="avatar">{item.studentName.slice(0, 1)}</span>
            <span>
              <b>
                {item.studentName}
                <small> · {item.studentNumber ?? ''}</small>
              </b>
              <small>
                {item.verificationDate} · {item.round}차 이의신청
              </small>
            </span>
            <Status value={item.status} label={APPEAL_STATUS_LABELS[item.status]} />
          </button>
        ))}
        {!items.length && (
          <Empty
            title="검토할 이의신청이 없어요"
            detail="반려 인증에 접수된 신청이 여기에 표시됩니다."
          />
        )}
      </Card>
      {appeal && (
        <Card>
          <CardTitle title="이의신청 상세" detail="인증 사진과 학생 소명을 확인해 주세요." />
          <div className="appeal-evidence">
            <div className="photo-placeholder">
              <img src={publicFileUrl(appeal.photoUrl)} alt="원본 인증 사진" />
            </div>
            <div>
              <div className="detail-line">
                <small>학생</small>
                <b>
                  {appeal.studentName} · {appeal.studentNumber}
                </b>
              </div>
              <div className="detail-line">
                <small>구역 · 인증일</small>
                <b>
                  {appeal.areaName} · {appeal.verificationDate}
                </b>
              </div>
              <div className="detail-line">
                <small>AI 반려 사유</small>
                <b>{appeal.failReasons.join(' · ') || '교사 반려'}</b>
              </div>
              {appeal.photoUrls.map((url) => (
                <img
                  className="appeal-photo"
                  key={url}
                  src={publicFileUrl(url)}
                  alt="이의신청 추가 사진"
                />
              ))}
              <div className="callout">
                <b>학생 소명 · {appeal.round}차</b>
                <p>{appeal.content}</p>
              </div>
              <label>
                교사 답변
                <textarea
                  value={reply}
                  onChange={(e) =>
                    setReplies((current) => ({ ...current, [appeal.appealId]: e.target.value }))
                  }
                  rows={3}
                  placeholder="학생에게 전달할 답변을 입력해 주세요"
                />
              </label>
            </div>
          </div>
          <div className="decision-actions">
            <button
              className="button secondary"
              disabled={!reply.trim()}
              onClick={() => onDecide(appeal, 'REJECTED', reply)}
            >
              이의신청 반려
            </button>
            <button
              className="button primary"
              disabled={!reply.trim()}
              onClick={() => onDecide(appeal, 'APPROVED', reply)}
            >
              승인 · 10분 적립
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
