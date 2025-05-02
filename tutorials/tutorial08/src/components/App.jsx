import React, { useState } from "react";
import NavBar from "./NavBar";
import { Image, Calendar, Button, Menu, Timeline, Modal } from 'antd';
//Menu icons import
import {
    AppstoreOutlined,
    ContainerOutlined,
    DesktopOutlined,
    MailOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    PieChartOutlined,
} from '@ant-design/icons';

// Menu variables
const items = [
    { key: '1', icon: <PieChartOutlined />, label: 'Option 1' },
    { key: '2', icon: <DesktopOutlined />, label: 'Option 2' },
    { key: '3', icon: <ContainerOutlined />, label: 'Option 3' },
    {
        key: 'sub1',
        label: 'Navigation One',
        icon: <MailOutlined />,
        children: [
            { key: '5', label: 'Option 5' },
            { key: '6', label: 'Option 6' },
            { key: '7', label: 'Option 7' },
            { key: '8', label: 'Option 8' },
        ],
    },
    {
        key: 'sub2',
        label: 'Navigation Two',
        icon: <AppstoreOutlined />,
        children: [
            { key: '9', label: 'Option 9' },
            { key: '10', label: 'Option 10' },
            {
                key: 'sub3',
                label: 'Submenu',
                children: [
                    { key: '11', label: 'Option 11' },
                    { key: '12', label: 'Option 12' },
                ],
            },
        ],
    },
];


export default function App() {

    //Modal  variables
    const [isModalOpen, setIsModalOpen] = useState(false);
    const showModal = () => {
        setIsModalOpen(true);
    };
    const handleOk = () => {
        setIsModalOpen(false);
    };
    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const [collapsed, setCollapsed] = useState(false);
    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
    };

    return (
        <>
            {/**Nav bar */}
            <NavBar />

            <main className="min-h-screen max-w-[1000px] mt-24 mx-auto">
                <p>Put your design system components in the space below...</p>

                 {/**Photo Gallery*/}
                <h2 className="font-Comfortaa my-4 font-bold text-xl">
                    Photo Gallery
                </h2>
                <div className="flex flex-wrap content-start">
                    <Image
                        src="https://picsum.photos/600/600?id=1"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=2"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=3"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=4"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=5"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=6"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=7"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=8"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=9"
                        width={200}
                    />
                    <Image
                        src="https://picsum.photos/600/600?id=10"
                        width={200}
                    />
                </div>

                {/** Calendar Implementation */}
                <h2 className="font-Comfortaa my-4 font-bold text-xl">Calendar</h2>
                <div>
                    <>
                        <Calendar fullscreen={false} showWeek />
                    </>
                </div>

                {/** Timeline Implementation */}
                <h2 className="font-Comfortaa my-4 font-bold text-xl">Timeline</h2>
                <Timeline
                    items={[
                        {
                            children: 'Task 1',
                        },
                        {
                            children: 'Task 2',
                        },
                        {
                            children: 'Task 3',
                        },
                        {
                            children: 'Task 4',
                        },
                    ]}
                />

                {/** Menu implementation */}
                <h2 className="font-Comfortaa my-4 font-bold text-xl">Menu</h2>
                <div style={{ width: 256 }}>
                    <Button type="primary" onClick={toggleCollapsed} style={{ marginBottom: 16 }}>
                        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    </Button>
                    <Menu
                        defaultSelectedKeys={['1']}
                        defaultOpenKeys={['sub1']}
                        mode="inline"
                        theme="dark"
                        inlineCollapsed={collapsed}
                        items={items}
                    />
                </div>

               

                <h2 className="font-Comfortaa my-4 font-bold text-xl">
                    Pop up 
                </h2>
                <div>
                    <>
                        <Button type="primary" onClick={showModal}>
                            CLick
                        </Button>
                        <Modal title="Basic Modal" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
                            <p><a href="https://www.linux.org/pages/download/">Click here please!</a></p>
                        </Modal>
                    </>
                </div>


            </main>

            <footer className="p-5 bg-white">footer here</footer>
        </>
    );
}