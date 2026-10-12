import paddle

print("Paddle version:", paddle.__version__, flush=True)
print("Paddle device:", paddle.get_device(), flush=True)

print("Creating tensor...", flush=True)
x = paddle.to_tensor([1.0, 2.0, 3.0])
print("Tensor:", x.numpy(), flush=True)

print("Running matrix operation...", flush=True)
a = paddle.randn([512, 512])
b = paddle.matmul(a, a)
print("Matrix operation passed:", b.shape, flush=True)
