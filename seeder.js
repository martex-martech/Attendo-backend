

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/userModel.js';
import Leave from './models/leaveModel.js';
import Attendance from './models/attendanceModel.js';
import Settings from './models/settingsModel.js';
import Notification from './models/notificationModel.js';
import connectDB from './config/db.js';

dotenv.config();

const users = [
    {
        email: 'super@martex.com',
        password: 'superpassword',
        role: 'SUPER_ADMIN',
        name: 'Super Admin',
        avatar: 'https://i.pravatar.cc/150?u=superadmin',
        employeeId: 'SADM001',
        department: 'Executive',
        phone: '000-000-0000',
        status: 'Active',
    },
    {
        email: 'admin@martex.com',
        password: 'adminpassword',
        role: 'ADMIN',
        name: 'Adrian',
        avatar: 'https://i.pravatar.cc/150?u=admin',
        employeeId: 'ADM001',
        department: 'Management',
        phone: '111-222-3333',
        status: 'Active',
    },
    {
        email: 'employee@martex.com',
        password: 'employeepassword',
        role: 'EMPLOYEE',
        name: 'Stephan Peralt',
        avatar: 'https://i.pravatar.cc/150?u=stephanperalt',
        employeeId: 'EMP001',
        department: 'Development',
        phone: '444-555-6666',
        status: 'Active',
    },
    {
        name: 'John Smith',
        email: 'john.smith@example.com',
        password: 'password123',
        role: 'EMPLOYEE',
        avatar: 'https://i.pravatar.cc/150?u=johnsmith',
        employeeId: 'EMP002',
        department: 'Design',
        phone: '123-456-7890',
        status: 'Active',
    },
    {
        name: 'Doglar Martini',
        email: 'doglar.martini@example.com',
        password: 'password123',
        role: 'EMPLOYEE',
        avatar: 'https://i.pravatar.cc/150?u=doglarmartini',
        employeeId: 'EMP003',
        department: 'Marketing',
        phone: '098-765-4321',
        status: 'On Leave',
    },
];


const importData = async () => {
    await connectDB();
    try {
        await User.deleteMany();
        await Leave.deleteMany();
        await Attendance.deleteMany();
        await Settings.deleteMany();
        await Notification.deleteMany();
        
        // Manually hash passwords before inserting to ensure correctness
        const createdUsers = users.map(user => {
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(user.password, salt);
            return {
                ...user,
                password: hashedPassword
            };
        });

        await User.insertMany(createdUsers);
        
        await Settings.create({ companyName: "Martex Inc."});

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    await connectDB();
    try {
        await User.deleteMany();
        await Leave.deleteMany();
        await Attendance.deleteMany();
        await Settings.deleteMany();
        await Notification.deleteMany();

        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}