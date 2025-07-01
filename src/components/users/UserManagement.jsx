import { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit, Trash2, User, Mail, Calendar, Shield } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { mockFirebase } from '../../services/firebase';
import { ROLE_OPTIONS, STATUS_OPTIONS } from '../../utils/constants';

const UserManagement = ({ showNotification }) => {
  const permissions = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'viewer',
    status: 'active'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await mockFirebase.firestore.collection('users').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (error) {
      showNotification('Error loading users', 'error');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredUsers(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await mockFirebase.firestore.collection('users').doc(editingUser.id).update({
          ...formData,
          updatedAt: new Date().toISOString()
        });
        showNotification('User updated successfully', 'success');
      } else {
        await mockFirebase.firestore.collection('users').add({
          ...formData,
          dateCreated: new Date().toISOString()
        });
        showNotification('User added successfully', 'success');
      }
      
      resetForm();
      loadUsers();
    } catch (error) {
      showNotification('Error saving user', 'error');
      console.error('Error saving user:', error);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await mockFirebase.firestore.collection('users').doc(id).delete();
        showNotification('User deleted successfully', 'success');
        loadUsers();
      } catch (error) {
        showNotification('Error deleting user', 'error');
        console.error('Error deleting user:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      username: '',
      email: '',
      role: 'viewer',
      status: 'active'
    });
    setEditingUser(null);
    setShowModal(false);
  };

  const getRoleLabel = (role) => {
    const roleOption = ROLE_OPTIONS.find(r => r.value === role);
    return roleOption ? roleOption.label : role;
