import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  IonPage,
  IonContent,
  IonButton,
  IonSpinner,
  IonIcon,
  IonChip,
  IonLabel,
} from '@ionic/react';
import { refreshOutline, trashOutline, closeCircleOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { Helmet } from 'react-helmet';
import CommonHeader from '../common/CommonHeader';
import AdminSidebar from '../common/AdminSidebar';
import API_URL from '../config';

interface JobDeleteRequest {
  id: number;
  jobId: number;
  annoId: string | null;
  annoSubject: string | null;
  companyCd: string | null;
  sysCompanyCdNm: string | null;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requesterId: string | null;
  requesterIp: string | null;
  processedBy: string | null;
  insertDts: string | null;
  processDts: string | null;
}

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: '대기', value: 'PENDING' },
  { label: '승인', value: 'APPROVED' },
  { label: '반려', value: 'REJECTED' },
  { label: '전체', value: '' },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'warning' },
  APPROVED: { label: '승인됨', color: 'success' },
  REJECTED: { label: '반려됨', color: 'medium' },
};

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const AdminJobDeleteRequests: React.FC = () => {
  const [requests, setRequests] = useState<JobDeleteRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await axios.get<JobDeleteRequest[]>(
        `${API_URL}/api/admin/job-delete-requests${params}`
      );
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('삭제요청 목록 조회 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (req: JobDeleteRequest) => {
    if (!window.confirm(`"${req.annoSubject ?? req.jobId}" 공고를 삭제(승인)하시겠습니까?\n승인 시 실제 공고가 삭제됩니다.`)) return;
    setProcessingId(req.id);
    try {
      await axios.post(`${API_URL}/api/admin/job-delete-requests/${req.id}/approve`);
      await fetchRequests();
    } catch (e) {
      console.error('승인 실패:', e);
      alert('승인 처리에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: JobDeleteRequest) => {
    if (!window.confirm(`"${req.annoSubject ?? req.jobId}" 삭제요청을 반려하시겠습니까?\n공고는 유지됩니다.`)) return;
    setProcessingId(req.id);
    try {
      await axios.post(`${API_URL}/api/admin/job-delete-requests/${req.id}/reject`);
      await fetchRequests();
    } catch (e) {
      console.error('반려 실패:', e);
      alert('반려 처리에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <IonPage>
      <Helmet>
        <title>관리자 - 공고 삭제요청</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="채용공고 삭제요청 검토 관리자 페이지" />
      </Helmet>
      <CommonHeader />
      <IonContent>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <AdminSidebar />
          <div style={{ flex: 1, minWidth: 0, maxWidth: 1000, margin: '0 auto', padding: 16 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22 }}>공고 삭제요청 관리</h1>
              <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>
                사용자가 요청한 공고 삭제 건을 검토합니다. 승인 시 실제 공고가 삭제됩니다.
              </p>
            </div>
            <IonButton fill="outline" size="default" onClick={fetchRequests} disabled={isLoading}>
              <IonIcon slot="start" icon={refreshOutline} />
              새로고침
            </IonButton>
          </header>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {STATUS_TABS.map((tab) => (
              <IonButton
                key={tab.value || 'all'}
                size="small"
                fill={statusFilter === tab.value ? 'solid' : 'outline'}
                color={statusFilter === tab.value ? 'primary' : 'medium'}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </IonButton>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 24 }}>
              <IonSpinner name="crescent" />
              <span>목록을 불러오는 중...</span>
            </div>
          ) : requests.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>삭제요청이 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map((req) => {
                const meta = STATUS_META[req.status] ?? { label: req.status, color: 'medium' };
                return (
                  <div
                    key={req.id}
                    style={{ border: '1px solid #e3e3e3', borderRadius: 10, padding: '12px 14px', background: '#fff' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <IonChip color={meta.color} style={{ margin: 0 }}>
                            <IonLabel>{meta.label}</IonLabel>
                          </IonChip>
                          <strong style={{ fontSize: 15 }}>{req.annoSubject ?? `(제목없음) job #${req.jobId}`}</strong>
                        </div>
                        <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
                          {req.sysCompanyCdNm ?? req.companyCd ?? '-'} · jobId {req.jobId}
                          {req.annoId ? ` · annoId ${req.annoId}` : ''}
                        </p>
                        {req.reason && (
                          <p style={{ margin: '6px 0 0', color: '#444', fontSize: 13 }}>사유: {req.reason}</p>
                        )}
                        <p style={{ margin: '6px 0 0', color: '#999', fontSize: 12 }}>
                          요청 {formatDate(req.insertDts)}
                          {req.requesterIp ? ` · IP ${req.requesterIp}` : ''}
                          {req.processDts ? ` · 처리 ${formatDate(req.processDts)} (${req.processedBy ?? '-'})` : ''}
                        </p>
                      </div>
                      {req.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <IonButton
                            size="small"
                            color="danger"
                            disabled={processingId === req.id}
                            onClick={() => handleApprove(req)}
                          >
                            {processingId === req.id ? (
                              <IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
                            ) : (
                              <>
                                <IonIcon slot="start" icon={trashOutline} />
                                승인(삭제)
                              </>
                            )}
                          </IonButton>
                          <IonButton
                            size="small"
                            fill="outline"
                            color="medium"
                            disabled={processingId === req.id}
                            onClick={() => handleReject(req)}
                          >
                            <IonIcon slot="start" icon={closeCircleOutline} />
                            반려
                          </IonButton>
                        </div>
                      )}
                      {req.status === 'APPROVED' && (
                        <IonIcon icon={checkmarkDoneOutline} color="success" style={{ fontSize: 22, flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminJobDeleteRequests;
