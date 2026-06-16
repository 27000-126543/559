#!/bin/bash

set -e

echo "=============================================="
echo "  数值仿真任务管理平台 - 启动脚本"
echo "=============================================="
echo ""

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装，请先安装 Docker 和 Docker Compose"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    echo "✅ Docker 环境检查通过"
    echo ""
}

create_env_files() {
    echo "📝 创建环境变量配置文件..."
    
    if [ ! -f backend/.env ]; then
        cp backend/.env.example backend/.env
        echo "✅ 已创建 backend/.env"
    fi
    
    echo ""
}

start_services() {
    echo "🚀 启动所有服务..."
    echo ""
    docker-compose up -d --build
    
    echo ""
    echo "⏳ 等待服务就绪..."
    sleep 10
    
    echo ""
    echo "📊 服务状态:"
    docker-compose ps
    echo ""
}

init_database() {
    echo "🗄️  初始化数据库..."
    docker-compose exec -T backend python manage.py makemigrations
    docker-compose exec -T backend python manage.py migrate
    echo "✅ 数据库迁移完成"
    echo ""
    
    echo "📥 导入初始数据..."
    docker-compose exec -T backend python scripts/init_data.py
    echo ""
}

show_urls() {
    echo "=============================================="
    echo "  ✅ 平台启动完成！"
    echo "=============================================="
    echo ""
    echo "📱 访问地址:"
    echo "  前端界面:    http://localhost:3000"
    echo "  后端API:     http://localhost:8000"
    echo "  WebSocket:   ws://localhost:8001"
    echo "  管理后台:    http://localhost:8000/admin"
    echo ""
    echo "👤 默认账号:"
    echo "  管理员:     admin / admin123456"
    echo "  项目负责人:  leader1 / leader123456"
    echo "              leader2 / leader123456"
    echo "  普通成员:    member1 ~ member5 / member123456"
    echo ""
    echo "📖 常用命令:"
    echo "  查看日志:    docker-compose logs -f [service_name]"
    echo "  停止服务:    docker-compose down"
    echo "  重启服务:    docker-compose restart"
    echo "  查看状态:    docker-compose ps"
    echo ""
    echo "📁 服务说明:"
    echo "  postgres:     PostgreSQL 15 数据库"
    echo "  redis:        Redis 7 缓存/消息队列"
    echo "  backend:      Django + DRF API 服务"
    echo "  celery_worker: Celery 异步任务工作进程"
    echo "  celery_beat:  Celery Beat 定时任务调度器"
    echo "  daphne:       Django Channels WebSocket 服务"
    echo "  frontend:     React + Vite 前端应用"
    echo ""
    echo "=============================================="
}

case "$1" in
    init)
        check_docker
        create_env_files
        start_services
        init_database
        show_urls
        ;;
    start)
        docker-compose up -d
        show_urls
        ;;
    stop)
        docker-compose down
        echo "✅ 所有服务已停止"
        ;;
    restart)
        docker-compose restart
        show_urls
        ;;
    logs)
        if [ -n "$2" ]; then
            docker-compose logs -f $2
        else
            docker-compose logs -f
        fi
        ;;
    status)
        docker-compose ps
        ;;
    init-data)
        init_database
        ;;
    *)
        echo "使用方法: $0 {init|start|stop|restart|logs|status|init-data}"
        echo ""
        echo "命令说明:"
        echo "  init      - 首次启动，初始化环境、数据库和示例数据"
        echo "  start     - 启动所有服务"
        echo "  stop      - 停止所有服务"
        echo "  restart   - 重启所有服务"
        echo "  logs      - 查看日志 (可指定服务名)"
        echo "  status    - 查看服务状态"
        echo "  init-data - 重新初始化示例数据"
        echo ""
        echo "示例:"
        echo "  $0 init          # 首次启动"
        echo "  $0 logs backend  # 查看后端日志"
        echo "  $0 logs celery_worker  # 查看Celery日志"
        exit 1
        ;;
esac
