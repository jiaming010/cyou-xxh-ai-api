import React, { useState, useMemo } from 'react';
import { Card, Table, Input, Modal } from '@douyinfe/semi-ui';
import { Users, Search } from 'lucide-react';
import { VChart } from '@visactor/react-vchart';
import { renderQuota, renderNumber, modelColorMap, modelToColor } from '../../helpers';

const AdminUsersPanel = ({
  userData,
  userModelData,
  CARD_PROPS,
  CHART_CONFIG,
  t,
}) => {
  const [searchText, setSearchText] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const aggregatedUsers = useMemo(() => {
    if (!userData || userData.length === 0) return [];
    const userMap = new Map();
    userData.forEach((item) => {
      const prev = userMap.get(item.username);
      if (prev) {
        prev.quota += item.quota;
        prev.token_used += item.token_used || 0;
        prev.count += item.count;
      } else {
        userMap.set(item.username, {
          username: item.username,
          quota: item.quota,
          token_used: item.token_used || 0,
          count: item.count,
        });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => b.quota - a.quota);
  }, [userData]);

  const filteredUsers = useMemo(() => {
    if (!searchText) return aggregatedUsers;
    const lower = searchText.toLowerCase();
    return aggregatedUsers.filter((u) =>
      u.username.toLowerCase().includes(lower),
    );
  }, [aggregatedUsers, searchText]);

  const selectedUserModels = useMemo(() => {
    if (!selectedUser || !userModelData || userModelData.length === 0) return [];
    return userModelData
      .filter((item) => item.username === selectedUser)
      .map((item) => ({
        model_name: item.model_name,
        quota: item.quota,
        token_used: item.token_used || 0,
        count: item.count,
      }))
      .sort((a, b) => b.quota - a.quota);
  }, [selectedUser, userModelData]);

  const detailChartSpec = useMemo(() => {
    if (selectedUserModels.length === 0) return null;
    const values = selectedUserModels.map((item) => ({
      Model: item.model_name,
      rawQuota: item.quota,
    }));
    const colors = {};
    selectedUserModels.forEach((item) => {
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
  }, [selectedUserModels, selectedUser, t]);

  const columns = [
    {
      title: t('用户名'),
      dataIndex: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: t('额度消耗'),
      dataIndex: 'quota',
      sorter: (a, b) => a.quota - b.quota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
    },
    {
      title: t('Token 消耗'),
      dataIndex: 'token_used',
      sorter: (a, b) => a.token_used - b.token_used,
      render: (text) => renderNumber(text),
    },
    {
      title: t('调用次数'),
      dataIndex: 'count',
      sorter: (a, b) => a.count - b.count,
      render: (text) => renderNumber(text),
    },
    {
      title: t('操作'),
      dataIndex: 'action',
      render: (_, record) => (
        <a
          onClick={() => {
            setSelectedUser(record.username);
            setDetailVisible(true);
          }}
        >
          {t('查看详情')}
        </a>
      ),
    },
  ];

  const detailColumns = [
    { title: t('模型名称'), dataIndex: 'model_name' },
    {
      title: t('额度消耗'),
      dataIndex: 'quota',
      sorter: (a, b) => a.quota - b.quota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
    },
    {
      title: t('Token 消耗'),
      dataIndex: 'token_used',
      sorter: (a, b) => a.token_used - b.token_used,
      render: (text) => renderNumber(text),
    },
    {
      title: t('调用次数'),
      dataIndex: 'count',
      sorter: (a, b) => a.count - b.count,
      render: (text) => renderNumber(text),
    },
  ];

  return (
    <>
      <Card
        {...CARD_PROPS}
        className='!rounded-2xl'
        title={
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-2'>
              <Users size={16} />
              {t('用户消耗明细')}
            </div>
            <Input
              prefix={<Search size={14} />}
              placeholder={t('搜索用户名')}
              value={searchText}
              onChange={setSearchText}
              style={{ width: 200 }}
              showClear
            />
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey='username'
          pagination={{
            pageSize: 10,
            showTotal: true,
            formatPageText: (page) =>
              `${t('共')} ${page.total} ${t('条')}`,
          }}
          size='small'
        />
      </Card>

      <Modal
        title={`${selectedUser} - ${t('模型消耗详情')}`}
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
        closeOnEsc
      >
        {detailChartSpec && (
          <div className='h-64 mb-4'>
            <VChart spec={detailChartSpec} option={CHART_CONFIG} />
          </div>
        )}
        <Table
          columns={detailColumns}
          dataSource={selectedUserModels}
          rowKey='model_name'
          pagination={false}
          size='small'
        />
      </Modal>
    </>
  );
};

export default AdminUsersPanel;
