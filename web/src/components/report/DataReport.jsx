import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Modal,
  DatePicker,
  Button,
  ButtonGroup,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { Users, Search, RefreshCw, FileBarChart, Download } from 'lucide-react';
import { VChart } from '@visactor/react-vchart';
import { useTranslation } from 'react-i18next';
import {
  API,
  showError,
  renderQuota,
  renderNumber,
  modelColorMap,
  modelToColor,
} from '../../helpers';

const { Text } = Typography;

const QUICK_RANGES = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
];

function getQuickRange(key) {
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  switch (key) {
    case 'today':
      return [startOfDay(now), now];
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return [startOfDay(y), startOfDay(now)];
    }
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return [startOfDay(d), now];
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return [startOfDay(d), now];
    }
    case 'thisMonth':
      return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    case 'lastMonth': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 1);
      return [first, last];
    }
    default:
      return [startOfDay(now), now];
  }
}

const CHART_CONFIG = {
  autoFit: true,
  animation: false,
};

const DataReport = () => {
  const { t } = useTranslation();

  const defaultRange = getQuickRange('30d');
  const [dateRange, setDateRange] = useState(defaultRange);
  const [activeRange, setActiveRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [searchText, setSearchText] = useState('');

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState([]);

  const toTimestamp = (date) => Math.floor(date.getTime() / 1000);

  const fetchSummary = useCallback(async (range) => {
    const [start, end] = range || dateRange;
    setLoading(true);
    try {
      const url = `/api/data/users/summary?start_timestamp=${toTimestamp(start)}&end_timestamp=${toTimestamp(end)}`;
      const res = await API.get(url);
      const { success, message, data } = res.data;
      if (success) {
        setSummaryData(data || []);
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchUserModelDetail = useCallback(async (username) => {
    const [start, end] = dateRange;
    setDetailLoading(true);
    try {
      const url = `/api/data/users/models?start_timestamp=${toTimestamp(start)}&end_timestamp=${toTimestamp(end)}`;
      const res = await API.get(url);
      const { success, message, data } = res.data;
      if (success) {
        const userModels = (data || [])
          .filter((item) => item.username === username)
          .sort((a, b) => b.quota - a.quota);
        setDetailData(userModels);
      } else {
        showError(message);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }, [dateRange]);

  const handleViewDetail = useCallback((username) => {
    setSelectedUser(username);
    setDetailVisible(true);
    fetchUserModelDetail(username);
  }, [fetchUserModelDetail]);

  const handleQuickRange = useCallback((key) => {
    setActiveRange(key);
    const range = getQuickRange(key);
    setDateRange(range);
    fetchSummary(range);
  }, [fetchSummary]);

  const handleDateChange = useCallback((dates) => {
    if (dates && dates.length === 2) {
      setActiveRange('custom');
      setDateRange(dates);
    }
  }, []);

  const handleSearch = useCallback(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchSummary(defaultRange);
  }, []);

  const filteredData = useMemo(() => {
    if (!searchText) return summaryData;
    const lower = searchText.toLowerCase();
    return summaryData.filter((u) =>
      u.username.toLowerCase().includes(lower),
    );
  }, [summaryData, searchText]);

  const totalQuota = useMemo(
    () => filteredData.reduce((sum, item) => sum + (item.quota || 0), 0),
    [filteredData],
  );
  const totalTokens = useMemo(
    () => filteredData.reduce((sum, item) => sum + (item.token_used || 0), 0),
    [filteredData],
  );
  const totalCount = useMemo(
    () => filteredData.reduce((sum, item) => sum + (item.count || 0), 0),
    [filteredData],
  );

  const detailChartSpec = useMemo(() => {
    if (detailData.length === 0) return null;
    const values = detailData.map((item) => ({
      Model: item.model_name,
      rawQuota: item.quota,
    }));
    const colors = {};
    detailData.forEach((item) => {
      colors[item.model_name] =
        modelColorMap[item.model_name] || modelToColor(item.model_name);
    });
    return {
      type: 'bar',
      data: [{ id: 'detailData', values }],
      xField: 'Model',
      yField: 'rawQuota',
      seriesField: 'Model',
      legends: { visible: false },
      title: {
        visible: true,
        text: `${selectedUser} - ${t('模型消耗分布')}`,
      },
      bar: {
        state: { hover: { stroke: '#000', lineWidth: 1 } },
      },
      axes: [
        { orient: 'bottom', type: 'band', label: { visible: true } },
        {
          orient: 'left',
          label: { formatMethod: (value) => renderQuota(value, 2) },
        },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: (datum) => datum['Model'],
              value: (datum) => renderQuota(datum['rawQuota'] || 0, 4),
            },
          ],
        },
      },
      color: { specified: colors },
    };
  }, [detailData, selectedUser, t]);

  const handleExportCSV = useCallback(() => {
    if (filteredData.length === 0) return;
    const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit')) || 500000;
    const headers = [t('用户名'), t('额度消耗'), t('Token 消耗'), t('调用次数')];
    const rows = filteredData.map((item) => [
      item.username,
      (item.quota / quotaPerUnit).toFixed(4),
      item.token_used || 0,
      item.count,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredData, t]);

  const columns = [
    {
      title: t('用户名'),
      dataIndex: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
      width: 200,
    },
    {
      title: t('额度消耗'),
      dataIndex: 'quota',
      sorter: (a, b) => a.quota - b.quota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
      width: 180,
    },
    {
      title: t('Token 消耗'),
      dataIndex: 'token_used',
      sorter: (a, b) => (a.token_used || 0) - (b.token_used || 0),
      render: (text) => renderNumber(text || 0),
      width: 160,
    },
    {
      title: t('调用次数'),
      dataIndex: 'count',
      sorter: (a, b) => a.count - b.count,
      render: (text) => renderNumber(text),
      width: 140,
    },
    {
      title: t('操作'),
      dataIndex: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          theme='borderless'
          type='primary'
          size='small'
          onClick={() => handleViewDetail(record.username)}
        >
          {t('详情')}
        </Button>
      ),
    },
  ];

  const detailColumns = [
    {
      title: t('模型名称'),
      dataIndex: 'model_name',
      width: 220,
    },
    {
      title: t('额度消耗'),
      dataIndex: 'quota',
      sorter: (a, b) => a.quota - b.quota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
      width: 180,
    },
    {
      title: t('Token 消耗'),
      dataIndex: 'token_used',
      sorter: (a, b) => (a.token_used || 0) - (b.token_used || 0),
      render: (text) => renderNumber(text || 0),
      width: 160,
    },
    {
      title: t('调用次数'),
      dataIndex: 'count',
      sorter: (a, b) => a.count - b.count,
      render: (text) => renderNumber(text),
      width: 140,
    },
  ];

  return (
    <div className='h-full'>
      {/* Header */}
      <div className='flex flex-col gap-3 mb-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-semibold text-gray-800 flex items-center gap-2'>
            <FileBarChart size={24} />
            {t('数据报表')}
          </h2>
          <div className='flex gap-3'>
            <Button
              type='tertiary'
              icon={<Download size={16} />}
              onClick={handleExportCSV}
              className='bg-green-500 hover:bg-green-600 text-white hover:bg-opacity-80 !rounded-full'
            />
            <Button
              type='tertiary'
              icon={<RefreshCw size={16} />}
              onClick={handleSearch}
              loading={loading}
              className='bg-blue-500 hover:bg-blue-600 text-white hover:bg-opacity-80 !rounded-full'
            />
          </div>
        </div>
        <div className='flex items-center gap-3 flex-wrap'>
          <ButtonGroup>
            {QUICK_RANGES.map((item) => (
              <Button
                key={item.value}
                type={activeRange === item.value ? 'primary' : 'tertiary'}
                size='small'
                onClick={() => handleQuickRange(item.value)}
              >
                {t(item.label)}
              </Button>
            ))}
          </ButtonGroup>
          <DatePicker
            type='dateTimeRange'
            value={dateRange}
            onChange={handleDateChange}
            density='compact'
            style={{ width: 380 }}
          />
          {activeRange === 'custom' && (
            <Button size='small' type='primary' onClick={handleSearch}>
              {t('查询')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
        <Card bodyStyle={{ padding: '16px 20px' }} className='!rounded-2xl'>
          <div className='text-xs text-gray-500 mb-1'>{t('总额度消耗')}</div>
          <div className='text-xl font-semibold'>{renderQuota(totalQuota, 4)}</div>
        </Card>
        <Card bodyStyle={{ padding: '16px 20px' }} className='!rounded-2xl'>
          <div className='text-xs text-gray-500 mb-1'>{t('总 Token 消耗')}</div>
          <div className='text-xl font-semibold'>{renderNumber(totalTokens)}</div>
        </Card>
        <Card bodyStyle={{ padding: '16px 20px' }} className='!rounded-2xl'>
          <div className='text-xs text-gray-500 mb-1'>{t('总调用次数')}</div>
          <div className='text-xl font-semibold'>{renderNumber(totalCount)}</div>
        </Card>
      </div>

      {/* User Table */}
      <Card
        className='!rounded-2xl'
        title={
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-2'>
              <Users size={16} />
              {t('用户消耗排行')}
              <Tag size='small' color='blue'>
                {filteredData.length} {t('位用户')}
              </Tag>
            </div>
            <Input
              prefix={<Search size={14} />}
              placeholder={t('搜索用户名')}
              value={searchText}
              onChange={setSearchText}
              style={{ width: 220 }}
              showClear
            />
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey='username'
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: true,
            formatPageText: (page) =>
              `${t('共')} ${page.total} ${t('条')}`,
          }}
          size='small'
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={`${selectedUser} - ${t('模型消耗详情')}`}
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={860}
        closeOnEsc
      >
        <Spin spinning={detailLoading}>
          {detailChartSpec && (
            <div className='h-64 mb-4'>
              <VChart spec={detailChartSpec} option={CHART_CONFIG} />
            </div>
          )}
          <Table
            columns={detailColumns}
            dataSource={detailData}
            rowKey='model_name'
            pagination={false}
            size='small'
          />
        </Spin>
      </Modal>
    </div>
  );
};

export default DataReport;
